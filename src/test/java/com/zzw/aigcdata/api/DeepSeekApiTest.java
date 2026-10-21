package com.zzw.aigcdata.api;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DeepSeekApiTest {

    @Test
    void chatParsesDeepSeekResponse() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/chat/completions", exchange -> {
            assertEquals("Bearer test-key", exchange.getRequestHeaders().getFirst("Authorization"));

            JSONObject message = new JSONObject()
                    .put("role", "assistant")
                    .put("content", "【【【【【\n"
                            + "{\"xAxis\":{\"type\":\"category\",\"data\":[\"1号\",\"2号\"]},"
                            + "\"yAxis\":{\"type\":\"value\"},\"series\":[{\"type\":\"line\",\"data\":[10,20]}]}\n"
                            + "【【【【【\n数据呈上升趋势。");
            JSONObject choice = new JSONObject().put("message", message);
            JSONArray choices = new JSONArray();
            choices.add(choice);
            JSONObject response = new JSONObject().put("choices", choices);
            byte[] body = response.toString().getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().set("Content-Type", "application/json;charset=UTF-8");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        try {
            DeepSeekApi api = new DeepSeekApi();
            ReflectionTestUtils.setField(api, "baseUrl",
                    "http://127.0.0.1:" + server.getAddress().getPort());
            ReflectionTestUtils.setField(api, "apiKey", "test-key");
            ReflectionTestUtils.setField(api, "model", "deepseek-chat");

            String result = api.chat("分析需求：\n分析增长趋势\n原始数据：\n日期,用户数\n1号,10\n2号,20");

            assertTrue(result.startsWith("【【【【【"));
            assertTrue(result.contains("\"type\":\"line\""));
            assertTrue(result.endsWith("数据呈上升趋势。"));
        }
        finally {
            server.stop(0);
        }
    }
}
