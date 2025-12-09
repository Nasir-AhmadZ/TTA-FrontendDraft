const amqp = require('amqplib');
require('dotenv').config();

class RabbitMQHelper {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      console.log('Connecting to RabbitMQ:', process.env.RABBITMQ_URL ? 'URL configured' : 'No URL');
      this.connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      console.log('RabbitMQ connected successfully');
      return this.channel;
    } catch (error) {
      console.error('RabbitMQ connection failed:', error.message);
      throw error;
    }
  }

  async publishMessage(queue, message) {
    try {
      if (!this.channel) {
        await this.connect();
      }
      
      await this.channel.assertQueue(queue, { durable: true });
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
      console.log(`Message published to ${queue}:`, message);
    } catch (error) {
      console.error('Failed to publish message:', error.message);
      throw error;
    }
  }

  async consumeMessages(queue, callback) {
    try {
      if (!this.channel) {
        await this.connect();
      }
      
      await this.channel.assertQueue(queue, { durable: true });
      console.log(`Started consuming messages from ${queue}`);
      this.channel.consume(queue, (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          console.log(`Message received from ${queue}:`, content);
          callback(content);
          this.channel.ack(msg);
        }
      });
    } catch (error) {
      console.error('Failed to consume messages:', error.message);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}

module.exports = RabbitMQHelper;