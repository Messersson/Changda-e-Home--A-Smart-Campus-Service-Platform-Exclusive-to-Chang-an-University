package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.CatalogService;
import cn.edu.chd.campus.service.GuestAccessService;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

  @PostMapping(value = "/upload-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<Map<String, Object>> uploadFile(
      Authentication authentication,
      @RequestPart("file") MultipartFile file,
      @RequestParam Map<String, String> fields) {
    return ApiResponse.ok(
        catalogService.uploadStudyMaterialFile(
            SecuritySupport.user(authentication).id(),
            fields,
            file),
        "资料上传成功，等待审核");
  }

  @GetMapping("/my")
  public ApiResponse<List<Map<String, Object>>> my(Authentication authentication) {
    return ApiResponse.ok(catalogService.myStudyMaterials(SecuritySupport.user(authentication).id()));
  }

  @GetMapping("/file/{id}")
  public ResponseEntity<byte[]> file(@PathVariable Long id) {
    Map<String, Object> material = catalogService.studyMaterialFile(id);
    byte[] content = (byte[]) material.get("fileContent");
    String fileName = Maps.stringValue(material.get("fileName"), "material-" + id);
    String contentType = Maps.stringValue(material.get("fileContentType"), MediaType.APPLICATION_OCTET_STREAM_VALUE);
    HttpHeaders headers = new HttpHeaders();
    headers.setContentDisposition(ContentDisposition.attachment()
        .filename(fileName, StandardCharsets.UTF_8)
        .build());
    headers.setContentType(MediaType.parseMediaType(contentType));
    headers.setContentLength(content.length);
    return ResponseEntity.ok().headers(headers).body(content);
  }

  @PostMapping("/download/{id}")
  public ApiResponse<Map<String, Object>> download(@PathVariable Long id) {
    return ApiResponse.ok(catalogService.downloadStudyMaterial(id), "下载成功");
  }
}
