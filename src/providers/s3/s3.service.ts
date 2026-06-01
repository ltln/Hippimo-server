import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface UploadedObject {
  key: string;
  url: string;
}

export interface DownloadedObject {
  body: Buffer;
  contentType?: string;
}

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string | undefined;
  private readonly endpoint: string | undefined;
  private readonly publicUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('s3.bucket');
    this.endpoint = this.configService.get<string>('s3.endpoint');
    this.publicUrl = this.configService.get<string>('s3.publicUrl');
    const accessKeyId = this.configService.get<string>('s3.accessKeyId');
    const secretAccessKey =
      this.configService.get<string>('s3.secretAccessKey');

    this.client = new S3Client({
      region: this.configService.get<string>('s3.region') || 'auto',
      endpoint: this.endpoint || undefined,
      forcePathStyle:
        this.configService.get<boolean>('s3.forcePathStyle') ?? false,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadedObject> {
    const bucket = this.getBucket();

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return {
      key: input.key,
      url: this.getPublicObjectUrl(input.key),
    };
  }

  async deleteObject(key: string): Promise<void> {
    const bucket = this.getBucket();

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  async getObject(key: string): Promise<DownloadedObject> {
    const bucket = this.getBucket();
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new InternalServerErrorException('S3 object body is empty');
    }

    return {
      body: Buffer.from(await response.Body.transformToByteArray()),
      contentType: response.ContentType || undefined,
    };
  }

  async getPresignedObjectUrl(key: string, expiresInSeconds = 900) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  getObjectKeyFromUrl(url: string): string | null {
    if (this.publicUrl) {
      const publicUrlPrefix = `${this.publicUrl.replace(/\/$/, '')}/`;
      if (url.startsWith(publicUrlPrefix)) {
        return this.decodeObjectKey(url.slice(publicUrlPrefix.length));
      }
    }

    if (this.endpoint && this.bucket) {
      const endpointPrefix = `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/`;
      if (url.startsWith(endpointPrefix)) {
        return this.decodeObjectKey(url.slice(endpointPrefix.length));
      }
    }

    if (this.bucket) {
      const region = this.configService.get<string>('s3.region') || 'auto';
      const awsPrefix = `https://${this.bucket}.s3.${region}.amazonaws.com/`;
      if (url.startsWith(awsPrefix)) {
        return this.decodeObjectKey(url.slice(awsPrefix.length));
      }
    }

    return null;
  }

  private decodeObjectKey(encodedKey: string) {
    return encodedKey
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');
  }

  private getBucket() {
    if (!this.bucket) {
      throw new InternalServerErrorException('S3 bucket is not configured');
    }

    return this.bucket;
  }

  private getPublicObjectUrl(key: string) {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }

    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    if (this.endpoint) {
      return `${this.endpoint.replace(/\/$/, '')}/${this.getBucket()}/${encodedKey}`;
    }

    const region = this.configService.get<string>('s3.region') || 'auto';

    return `https://${this.getBucket()}.s3.${region}.amazonaws.com/${encodedKey}`;
  }
}
