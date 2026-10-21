package com.zzw.aigcdata.api;

import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.zzw.aigcdata.common.ErrorCode;
import com.zzw.aigcdata.exception.BusinessException;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * DeepSeek OpenAI-compatible chat API.
 */
@Service
public class DeepSeekApi {

    private static final String RESULT_MARKER = "【【【【【";

    private static final String SYSTEM_PROMPT = "你是一个数据分析师和前端开发专家。"
            + "请根据用户提供的分析目标和 CSV 原始数据，严格按照下面的格式返回内容，不要输出其他内容：\n"
            + RESULT_MARKER + "\n"
            + "{前端 ECharts V5 的 option JSON 对象，不要使用 Markdown 代码块，不要添加注释}\n"
            + RESULT_MARKER + "\n"
            + "{明确、详细的中文数据分析结论}";

    @Value("${ai.deepseek.base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${ai.deepseek.api-key:}")
    private String apiKey;

    @Value("${ai.deepseek.model:deepseek-chat}")
    private String model;

    public boolean isConfigured() {
        return StringUtils.isNotBlank(apiKey);
    }

    public String chat(String message) {
        if (!isConfigured()) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "未配置 DeepSeek API Key");
        }

        JSONObject requestBody = new JSONObject();
        requestBody.put("model", model);
        requestBody.put("stream", false);
        requestBody.put("temperature", 0.2);

        JSONArray messages = new JSONArray();
        messages.add(new JSONObject()
                .put("role", "system")
                .put("content", SYSTEM_PROMPT));
        messages.add(new JSONObject()
                .put("role", "user")
                .put("content", message));
        requestBody.put("messages", messages);

        HttpResponse response = HttpRequest.post(resolveChatUrl())
                .header("Authorization", "Bearer " + apiKey.trim())
                .header("Content-Type", "application/json;charset=UTF-8")
                .timeout(120000)
                .body(requestBody.toString())
                .execute();
        String responseBody = response.body();
        if (!response.isOk()) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                    "DeepSeek 请求失败，HTTP " + response.getStatus() + ": " + extractError(responseBody));
        }

        String content = extractContent(responseBody);
        if (StringUtils.isBlank(content)) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "DeepSeek 返回内容为空");
        }
        return normalizeResult(content);
    }

    private String resolveChatUrl() {
        String url = StringUtils.defaultIfBlank(baseUrl, "https://api.deepseek.com").trim();
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        return url.endsWith("/chat/completions") ? url : url + "/chat/completions";
    }

    private String extractContent(String responseBody) {
        try {
            JSONObject responseJson = JSONUtil.parseObj(responseBody);
            JSONArray choices = responseJson.getJSONArray("choices");
            if (choices == null || choices.isEmpty()) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                        "DeepSeek 响应缺少 choices: " + extractError(responseBody));
            }
            JSONObject message = choices.getJSONObject(0).getJSONObject("message");
            return message == null ? null : message.getStr("content");
        }
        catch (BusinessException e) {
            throw e;
        }
        catch (Exception e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                    "DeepSeek 响应解析失败: " + StringUtils.abbreviate(responseBody, 300));
        }
    }

    private String extractError(String responseBody) {
        try {
            JSONObject responseJson = JSONUtil.parseObj(responseBody);
            JSONObject error = responseJson.getJSONObject("error");
            if (error != null) {
                return StringUtils.defaultString(error.getStr("message"), "未知错误");
            }
        }
        catch (Exception ignored) {
            // Fall through to the abbreviated response body.
        }
        return StringUtils.abbreviate(StringUtils.defaultString(responseBody), 300);
    }

    private String normalizeResult(String content) {
        String normalized = content
                .replace("```json", "")
                .replace("```", "")
                .trim();
        int firstMarker = normalized.indexOf(RESULT_MARKER);
        int secondMarker = firstMarker < 0
                ? -1
                : normalized.indexOf(RESULT_MARKER, firstMarker + RESULT_MARKER.length());
        if (firstMarker < 0 || secondMarker < 0) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "DeepSeek 返回格式不符合要求");
        }
        return normalized;
    }
}
