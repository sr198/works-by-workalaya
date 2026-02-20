import { Kafka, Producer, Consumer, EachMessagePayload, logLevel } from 'kafkajs';
import { DomainEvent, SerializedDomainEvent } from '../domain/domain-event';

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
}

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Consumer[] = [];

  constructor(config: KafkaConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      logLevel: logLevel.WARN,
    });
  }

  async connectProducer(): Promise<void> {
    this.producer = this.kafka.producer();
    await this.producer.connect();
  }

  async publish(topic: string, event: DomainEvent): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connectProducer() first.');
    }
    const cloudEvent: SerializedDomainEvent = event.toCloudEvent();
    await this.producer.send({
      topic,
      messages: [
        {
          key: cloudEvent.data.aggregateId,
          value: JSON.stringify(cloudEvent),
          headers: {
            'ce-type': cloudEvent.type,
            'ce-source': cloudEvent.source,
            'ce-id': cloudEvent.id,
            'ce-specversion': cloudEvent.specversion,
          },
        },
      ],
    });
  }

  async publishAll(topic: string, events: DomainEvent[]): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connectProducer() first.');
    }
    if (events.length === 0) return;

    const messages = events.map((event) => {
      const cloudEvent = event.toCloudEvent();
      return {
        key: cloudEvent.data.aggregateId,
        value: JSON.stringify(cloudEvent),
        headers: {
          'ce-type': cloudEvent.type,
          'ce-source': cloudEvent.source,
          'ce-id': cloudEvent.id,
          'ce-specversion': cloudEvent.specversion,
        },
      };
    });

    await this.producer.send({ topic, messages });
  }

  async subscribe(
    groupId: string,
    topic: string,
    handler: (event: SerializedDomainEvent, payload: EachMessagePayload) => Promise<void>,
  ): Promise<Consumer> {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload) => {
        if (!payload.message.value) return;
        const event: SerializedDomainEvent = JSON.parse(payload.message.value.toString());
        await handler(event, payload);
      },
    });

    this.consumers.push(consumer);
    return consumer;
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
    this.consumers = [];
  }
}
