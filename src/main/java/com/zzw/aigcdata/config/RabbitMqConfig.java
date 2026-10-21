package com.zzw.aigcdata.config;

import com.zzw.aigcdata.bizmq.BiMqConstant;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the exchange, queue, and binding used by BI analysis tasks.
 */
@Configuration
public class RabbitMqConfig {

    private static final String CODE_EXCHANGE_NAME = "code_exchange";

    private static final String CODE_QUEUE_NAME = "code_queue";

    private static final String CODE_ROUTING_KEY = "my_routingKey";

    @Bean
    public DirectExchange biExchange() {
        return new DirectExchange(BiMqConstant.BI_EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue biQueue() {
        return QueueBuilder.durable(BiMqConstant.BI_QUEUE_NAME).build();
    }

    @Bean
    public Binding biBinding(DirectExchange biExchange, Queue biQueue) {
        return BindingBuilder.bind(biQueue)
                .to(biExchange)
                .with(BiMqConstant.BI_ROUTING_KEY);
    }

    @Bean
    public DirectExchange codeExchange() {
        return new DirectExchange(CODE_EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue codeQueue() {
        return QueueBuilder.durable(CODE_QUEUE_NAME).build();
    }

    @Bean
    public Binding codeBinding(DirectExchange codeExchange, Queue codeQueue) {
        return BindingBuilder.bind(codeQueue)
                .to(codeExchange)
                .with(CODE_ROUTING_KEY);
    }
}
