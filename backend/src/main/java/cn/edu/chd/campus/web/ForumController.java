package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.CatalogService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forum")
public class ForumController {

  private final CatalogService catalogService;

  public ForumController(CatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping("/categories")
  public ApiResponse<List<Map<String, Object>>> categories() {
    return ApiResponse.ok(catalogService.forumCategories());
  }

  @GetMapping("/list")
  public ApiResponse<List<Map<String, Object>>> list(@RequestParam Map<String, String> query) {
    return ApiResponse.ok(catalogService.forumPosts(new LinkedHashMap<>(query)));
  }

  @GetMapping("/detail/{id}")
  public ApiResponse<Map<String, Object>> detail(@PathVariable Long id) {
    return ApiResponse.ok(catalogService.forumPost(id));
  }

  @PostMapping("/publish")
  public ApiResponse<Map<String, Object>> publish(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(catalogService.publishForumPost(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "帖子发布成功，等待审核");
  }

  @PostMapping("/like/{id}")
  public ApiResponse<Map<String, Object>> like(@PathVariable Long id) {
    return ApiResponse.ok(catalogService.likeForumPost(id), "点赞成功");
  }

  @PostMapping("/comment/{id}")
  public ApiResponse<Map<String, Object>> comment(Authentication authentication, @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(catalogService.commentForumPost(SecuritySupport.user(authentication).id(), id, Maps.mutable(request)), "评论成功");
  }

  @GetMapping("/my")
  public ApiResponse<List<Map<String, Object>>> my(Authentication authentication) {
    return ApiResponse.ok(catalogService.myForumPosts(SecuritySupport.user(authentication).id()));
  }
}
