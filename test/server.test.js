process.env.NODE_ENV = 'test';

const chai = require('chai');
const { MongoMemoryServer } = require('mongodb-memory-server');
const chaiHttp = require('chai-http');
const randomString = require('randomstring');
const jwt = require('jsonwebtoken');
const qs = require('qs');
const { ObjectId } = require('mongodb');

const config = require('../config');
const { assert } = require('chai');

const { expect } = chai;
const mongoServer = new MongoMemoryServer();

chai.use(chaiHttp);

describe('Server', () => {
  let server;
  let client;

  beforeEach(async function(){
    this.timeout(10000);

    config.database = await mongoServer.getUri();
    
    const res = await require('../index')();
    server = res.listener;
    client = res.client;
  });

  afterEach(async function(){
    this.timeout(10000);
    await mongoServer.stop();
    client.close();
    server.close();
  });

  it('should run', () => {});

  describe('Authentication & Authorization', () => {
    it('should forbidden access with nokey', done => {
      chai.request(server)
        .get('/pets')
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    it('should forbidden access with no valid api key', done => {
      chai.request(server)
        .get('/pets')
        .set('X-API-Key', randomString.generate(16))
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    it('should access with default config account', done => {
      chai.request(server)
        .get('/pets')
        .set('X-API-Key', config.admin.apiKey)
        .end((err, res) => {
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should get token by password', async () => {
      const res = await chai.request(server)
        .post('/authentication')
        .send({
          email: config.admin.email,
          password: config.admin.password
        });

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('token');

      const payload = jwt.verify(res.body.token, config.jwt);
      expect(payload).to.have.property('email');

      const res2 = await chai.request(server)
        .get(`/pets`)
        .set('Authorization', `JWT ${res.body.token}`);
        
      expect(res2).to.have.status(200);
      expect(res2.body).to.have.property('total');
      expect(res2.body).to.have.property('limit');
      expect(res2.body).to.have.property('skip');
      expect(res2.body).to.have.property('data');
    }); 

    it('should forbidden because of wrong password', done => {
      
      chai.request(server)
        .post('/authentication')
        .send({
          email: config.admin.email,
          password: randomString.generate(16)
        })
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    }); 

    it('should forbidden because of wrong email', done => {
      
      chai.request(server)
        .post('/authentication')
        .send({
          email: "wrong@",
          password: randomString.generate(16)
        })
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    }); 

    it('should forbidden because of wrong user', done => {
      
      chai.request(server)
        .post('/authentication')
        .send({
          email: 'wronguser@example.com',
          password: randomString.generate(16)
        })
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    }); 

    it('should forbidden because of missing value', done => {
      chai.request(server)
        .post('/authentication')
        .send({
          email: config.admin.email
        })
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    }); 

    it('should forbidden because of wrong token', async () => {
      expect(await chai.request(server)
        .get(`/pets`)
        .set('Authorization', 'wrongtoken')).to.has.property('status', 403);

      expect(await chai.request(server)
        .get(`/pets`)
        .set('Authorization', 'wrong token')).to.has.property('status', 403);
      
      expect(await chai.request(server)
        .get(`/pets`)
        .set('Authorization', 'jwt wrongtoken')).to.has.property('status', 403);
    }); 
  });

  describe('Request', () => {
    it('should get not found', async () => {
      const res = await chai.request(server)
        .get('/nomodels')
        .set('X-API-Key', config.admin.apiKey);

      expect(res).to.have.status(404);
      expect(res.body).to.have.property('error', 'not found');
    });

    it('should get list', async () => {
      const res = await chai.request(server)
        .get(`/pets`)
        .set('X-API-Key', config.admin.apiKey);
        
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('total');
      expect(res.body).to.have.property('limit');
      expect(res.body).to.have.property('skip');
      expect(res.body).to.have.property('data');
    });

    it('should get list which shared', async () => {
      const res = await chai.request(server)
        .get(`/people`);
        
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('total');
      expect(res.body).to.have.property('limit');
      expect(res.body).to.have.property('skip');
      expect(res.body).to.have.property('data');
    });

    it('should get list with query', async () => {
      const res = await chai.request(server)
        .get(`/pets?${qs.stringify({ $sort: { name: 1 }, $limit: 10, $skip: 0 })}`)
        .set('X-API-Key', config.admin.apiKey);
        
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('total');
      expect(res.body).to.have.property('limit');
      expect(res.body).to.have.property('skip');
      expect(res.body).to.have.property('data');
    });

    it('should create', async () => {
      const newDoc = {
        name: 'test'
      };

      const res = await chai.request(server)
        .post('/pets')
        .set('X-API-Key', config.admin.apiKey)
        .send(newDoc);
      
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('_id');
      expect(res.body).to.have.property('name', newDoc.name);

      const res2 = await chai.request(server)
        .get(`/pets/${res.body._id}`)
        .set('X-API-Key', config.admin.apiKey);

      expect(res2).to.have.status(200);
      expect(res2.body).to.have.property('_id');
      expect(res2.body).to.have.property('name', newDoc.name);
    });

    it('should patch', async () => {
      const newDoc = {
        name: 'test'
      };

      const res = await chai.request(server)
        .post('/pets')
        .set('X-API-Key', config.admin.apiKey)
        .send(newDoc);
      
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('_id');
      expect(res.body).to.have.property('name', newDoc.name);

      const patchDoc = {
        name: 'test4'
      };

      const res2 = await chai.request(server)
        .patch(`/pets/${res.body._id}`)
        .set('X-API-Key', config.admin.apiKey)
        .send(patchDoc);

      expect(res2).to.have.status(200);
      expect(res2.body).to.have.property('_id');
      expect(res2.body).to.have.property('name', patchDoc.name);
    });

    it('should not patch non-exists', async () => {
      const patchDoc = {
        name: 'test4'
      };

      const res2 = await chai.request(server)
        .patch(`/pets/${ObjectId()}`)
        .set('X-API-Key', config.admin.apiKey)
        .send(patchDoc);

      expect(res2).to.have.status(404);
      expect(res2.body).to.have.property('error', 'not found');
    });

    it('should remove', async () => {
      const newDoc = {
        name: 'test5'
      };

      const { body: preDoc } = await chai.request(server)
      .post('/pets')
      .set('X-API-Key', config.admin.apiKey)
        .send(newDoc);

      const delRes = await chai.request(server)
        .delete(`/pets/${preDoc._id}`)
        .set('X-API-Key', config.admin.apiKey)

      const res = await chai.request(server)
        .get(`/pets/${preDoc._id}`)
        .set('X-API-Key', config.admin.apiKey)
        

      expect(delRes).to.have.status(200);
      expect(delRes.body).to.have.property('_id');
      expect(delRes.body).to.have.property('name', newDoc.name);
  
      expect(res).to.have.status(404);
    });

    it('should not remove non-exists', async () => {
      const delRes = await chai.request(server)
        .delete(`/pets/${ObjectId()}`)
        .set('X-API-Key', config.admin.apiKey)
        
      expect(delRes).to.have.status(404);
      expect(delRes.body).to.have.property('error', 'not found');
    });
  });
});