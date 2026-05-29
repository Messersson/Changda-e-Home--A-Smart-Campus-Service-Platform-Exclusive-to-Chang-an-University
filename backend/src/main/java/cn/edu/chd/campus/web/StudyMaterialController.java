package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.CatalogService;
import cn.edu.chd.campus.service.GuestAccessService;
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
@RequestMapping("/api/study-material")
public class StudyMaterialController {

  private final CatalogService catalogService;
  private final GuestAccessService guestAccessService;

  public StudyMaterialController(CatalogService catalogService, GuestAccessService guestAccessService) {
    this.catalogService = catalogService;
    this.guestAccessService = guestAccessService;
  }

  @GetMapping("/list")
  public ApiResponse<List<Map<String, Object>>> list(Authentication authentication, @RequestParam Map<String, String> query) {
    guestAccessService.requireEnabledForGuest(authentication);
    return ApiResponse.ok(catalogService.studyMaterials(new LinkedHashMap<>(query)));
  }

  @GetMapping("/detail/{id}")
  public ApiResponse<Map<String, Object>> detail(Authentication authentication, @PathVariable Long id) {
    guestAccessService.requireEnabledForGuest(authentication);
    return ApiResponse.ok(catalogService.studyMaterial(id));
  }

  @PostMapping("/upload")
  public ApiResponse<Map<String, Object>> upload(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(catalogService.uploadStudyMaterial(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "资料上传成功，等待审核");
  }

  @GetMapping("/my")
  public ApiResponse<List<Map<String, Object>>> my(Authentication authentication) {
    return ApiResponse.ok(catalogService.myStudyMaterials(SecuritySupport.user(authentication).id()));
  }

  @PostMapping("/download/{id}")
  public ApiResponse<Map<String, Object>> download(@PathVariable Long id) {
    return ApiResponse.ok(catalogService.downloadStudyMaterial(id), "下载成功");
  }
}
