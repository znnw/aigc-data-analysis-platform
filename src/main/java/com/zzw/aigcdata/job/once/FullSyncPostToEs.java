package com.zzw.aigcdata.job.once;

import com.zzw.aigcdata.esdao.PostEsDao;
import com.zzw.aigcdata.model.dto.post.PostEsDTO;
import com.zzw.aigcdata.model.entity.Post;
import com.zzw.aigcdata.service.PostService;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * 全量同步帖子到 es
 *
 * @author zzw
*/
@Component
@Slf4j
public class FullSyncPostToEs implements CommandLineRunner {

    @Resource
    private PostService postService;

    @Resource
    private PostEsDao postEsDao;

    @Override
    public void run(String... args) {
        try {
            List<Post> postList = postService.list();
            if (CollectionUtils.isEmpty(postList)) {
                return;
            }
            List<PostEsDTO> postEsDTOList = postList.stream().map(PostEsDTO::objToDto).collect(Collectors.toList());
            final int pageSize = 500;
            int total = postEsDTOList.size();
            log.info("FullSyncPostToEs start, total {}", total);
            for (int i = 0; i < total; i += pageSize) {
                int end = Math.min(i + pageSize, total);
                log.info("sync from {} to {}", i, end);
                postEsDao.saveAll(postEsDTOList.subList(i, end));
            }
            log.info("FullSyncPostToEs end, total {}", total);
        }
        catch (Exception e) {
            log.error("FullSyncPostToEs failed; backend startup will continue", e);
        }
    }
}
