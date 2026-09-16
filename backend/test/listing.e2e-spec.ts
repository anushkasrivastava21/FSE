import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ListingController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/listings (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/listings');
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  it('/listings/:id (GET) with invalid id', async () => {
    const response = await request(app.getHttpServer()).get('/listings/999999');
    expect(response.status).toBe(404);
  });

  it('/listings (POST) prepareTransaction', async () => {
    const payload = {
      foodType: 0,
      quantity: 50,
      expiryTimestamp: Math.floor(Date.now() / 1000) + 3600,
      qualityTier: 1,
      locationHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      metadataURI: 'ipfs://some-cid'
    };
    const response = await request(app.getHttpServer())
      .post('/listings')
      .send(payload);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('to');
    expect(response.body).toHaveProperty('data');
  });
});
