package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.AdminService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

  private final AdminService adminService;

  public AdminController(AdminService adminService) {
    this.adminService = adminService;
  }

  @GetMapping("/stats")
  public ApiResponse<Map<String, Object>> stats() {
    return ApiResponse.ok(adminService.stats());
  }

  @GetMapping("/users")
  public ApiResponse<List<Map<String, Object>>> users(@RequestParam(required = false) String keyword) {
    return ApiResponse.ok(adminService.users(keyword));
  }

  @PostMapping("/users")
  public ApiResponse<Map<String, Object>> addUser(@RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.addUser(Maps.mutable(request)), "用户添加成功");
  }

  @PutMapping("/users/{id}")
  public ApiResponse<Map<String, Object>> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateUser(id, Maps.mutable(request)), "用户信息更新成功");
  }

  @PutMapping("/users/{id}/status")
  public ApiResponse<Map<String, Object>> updateUserStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateUserStatus(id, status(request)), "用户状态更新成功");
  }

  @DeleteMapping("/users/{id}")
  public ApiResponse<Void> deleteUser(Authentication authentication, @PathVariable Long id) {
    adminService.deleteUser(id, SecuritySupport.user(authentication).id());
    return ApiResponse.ok("用户删除成功");
  }

  @GetMapping("/settings/guest-access")
  public ApiResponse<Map<String, Object>> guestAccessSetting() {
    return ApiResponse.ok(adminService.guestAccessSetting());
  }

  @PutMapping("/settings/guest-access")
  public ApiResponse<Map<String, Object>> updateGuestAccess(@RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateGuestAccess(Maps.mutable(request)), "访客浏览设置已更新");
  }


  @GetMapping("/snacks")
  public ApiResponse<List<Map<String, Object>>> snacks(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.snacks(status));
  }

  @PostMapping("/snacks")
  public ApiResponse<Map<String, Object>> addSnack(@RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.addSnack(Maps.mutable(request)), "菜品添加成功");
  }

  @PutMapping("/snacks/{id}")
  public ApiResponse<Map<String, Object>> updateSnack(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateSnack(id, Maps.mutable(request)), "菜品更新成功");
  }

  @DeleteMapping("/snacks/{id}")
  public ApiResponse<Void> deleteSnack(@PathVariable Long id) {
    adminService.deleteSnack(id);
    return ApiResponse.ok("菜品删除成功");
  }

  @GetMapping("/supermarket/categories")
  public ApiResponse<List<Map<String, Object>>> categories() {
    return ApiResponse.ok(adminService.categories());
  }

  @PostMapping("/supermarket/categories")
  public ApiResponse<Map<String, Object>> addCategory(@RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.addCategory(Maps.mutable(request)), "分类添加成功");
  }

  @PutMapping("/supermarket/categories/{id}")
  public ApiResponse<Map<String, Object>> updateCategory(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateCategory(id, Maps.mutable(request)), "分类更新成功");
  }

  @DeleteMapping("/supermarket/categories/{id}")
  public ApiResponse<Void> deleteCategory(@PathVariable Long id) {
    adminService.deleteCategory(id);
    return ApiResponse.ok("分类删除成功");
  }

  @GetMapping("/supermarket/products")
  public ApiResponse<List<Map<String, Object>>> products(@RequestParam Map<String, String> query) {
    return ApiResponse.ok(adminService.products(new LinkedHashMap<>(query)));
  }

  @PostMapping("/supermarket/products")
  public ApiResponse<Map<String, Object>> addProduct(@RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.addProduct(Maps.mutable(request)), "商品添加成功");
  }

  @PutMapping("/supermarket/products/{id}")
  public ApiResponse<Map<String, Object>> updateProduct(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateProduct(id, Maps.mutable(request)), "商品更新成功");
  }

  @DeleteMapping("/supermarket/products/{id}")
  public ApiResponse<Void> deleteProduct(@PathVariable Long id) {
    adminService.deleteProduct(id);
    return ApiResponse.ok("商品删除成功");
  }

  @GetMapping("/tutors")
  public ApiResponse<List<Map<String, Object>>> tutors(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.tutors(status));
  }

  @PutMapping("/tutors/{id}/status")
  public ApiResponse<Map<String, Object>> updateTutorStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateTutorStatus(id, status(request)), "家教信息审核成功");
  }

  @DeleteMapping("/tutors/{id}")
  public ApiResponse<Void> deleteTutor(@PathVariable Long id) {
    adminService.deleteTutor(id);
    return ApiResponse.ok("家教信息删除成功");
  }

  @GetMapping("/secondhand")
  public ApiResponse<List<Map<String, Object>>> secondhand(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.secondhand(status));
  }

  @PutMapping("/secondhand/{id}/status")
  public ApiResponse<Map<String, Object>> updateSecondhandStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateSecondhandStatus(id, status(request)), "二手商品审核成功");
  }

  @DeleteMapping("/secondhand/{id}")
  public ApiResponse<Void> deleteSecondhand(@PathVariable Long id) {
    adminService.deleteSecondhand(id);
    return ApiResponse.ok("二手商品删除成功");
  }

  @GetMapping("/study-materials")
  public ApiResponse<List<Map<String, Object>>> studyMaterials(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.studyMaterials(status));
  }

  @PutMapping("/study-materials/{id}/status")
  public ApiResponse<Map<String, Object>> updateStudyMaterialStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateStudyMaterialStatus(id, status(request)), "学习资料审核成功");
  }

  @DeleteMapping("/study-materials/{id}")
  public ApiResponse<Void> deleteStudyMaterial(@PathVariable Long id) {
    adminService.deleteStudyMaterial(id);
    return ApiResponse.ok("学习资料删除成功");
  }

  @GetMapping("/forum-posts")
  public ApiResponse<List<Map<String, Object>>> forumPosts(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.forumPosts(status));
  }

  @PutMapping("/forum-posts/{id}/status")
  public ApiResponse<Map<String, Object>> updateForumPostStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateForumPostStatus(id, status(request)), "帖子审核成功");
  }

  @DeleteMapping("/forum-posts/{id}")
  public ApiResponse<Void> deleteForumPost(@PathVariable Long id) {
    adminService.deleteForumPost(id);
    return ApiResponse.ok("帖子删除成功");
  }

  @GetMapping("/orders")
  public ApiResponse<List<Map<String, Object>>> orders(@RequestParam Map<String, String> query) {
    return ApiResponse.ok(adminService.orders(new LinkedHashMap<>(query)));
  }

  @PutMapping("/orders/{id}/status")
  public ApiResponse<Map<String, Object>> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateOrderStatus(id, status(request)), "订单状态更新成功");
  }

  @GetMapping("/driving-schools")
  public ApiResponse<List<Map<String, Object>>> drivingSchools(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.drivingSchools(status));
  }

  @PostMapping("/driving-schools")
  public ApiResponse<Map<String, Object>> addDrivingSchool(@RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.addDrivingSchool(Maps.mutable(request)), "驾校添加成功");
  }

  @PutMapping("/driving-schools/{id}")
  public ApiResponse<Map<String, Object>> updateDrivingSchool(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateDrivingSchool(id, Maps.mutable(request)), "驾校更新成功");
  }

  @DeleteMapping("/driving-schools/{id}")
  public ApiResponse<Void> deleteDrivingSchool(@PathVariable Long id) {
    adminService.deleteDrivingSchool(id);
    return ApiResponse.ok("驾校删除成功");
  }

  @GetMapping("/driving-inquiries")
  public ApiResponse<List<Map<String, Object>>> drivingInquiries() {
    return ApiResponse.ok(adminService.drivingInquiries());
  }

  @PutMapping("/driving-inquiries/{id}/status")
  public ApiResponse<Void> updateDrivingInquiryStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    adminService.updateDrivingInquiryStatus(id, status(request));
    return ApiResponse.ok("咨询状态更新成功");
  }

  @GetMapping("/merchant-applications")
  public ApiResponse<List<Map<String, Object>>> merchantApplications(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.merchantApplications(status));
  }

  @PutMapping("/merchant-applications/{id}/approve")
  public ApiResponse<Map<String, Object>> approveMerchantApplication(
      Authentication authentication,
      @PathVariable Long id,
      @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(
        adminService.approveMerchantApplication(id, SecuritySupport.user(authentication).id(), Maps.mutable(request)),
        "Merchant application approved");
  }

  @PutMapping("/merchant-applications/{id}/reject")
  public ApiResponse<Map<String, Object>> rejectMerchantApplication(
      Authentication authentication,
      @PathVariable Long id,
      @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(
        adminService.rejectMerchantApplication(id, SecuritySupport.user(authentication).id(), Maps.mutable(request)),
        "Merchant application rejected");
  }

  @GetMapping("/merchants")
  public ApiResponse<List<Map<String, Object>>> merchants(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.merchants(status));
  }

  @PutMapping("/merchants/{id}/status")
  public ApiResponse<Map<String, Object>> updateMerchantStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.updateMerchantStatus(id, status(request)), "Merchant status updated");
  }

  @GetMapping("/after-sales")
  public ApiResponse<List<Map<String, Object>>> afterSales(@RequestParam(required = false) String status) {
    return ApiResponse.ok(adminService.afterSales(status));
  }

  @PutMapping("/after-sales/{id}/decision")
  public ApiResponse<Map<String, Object>> decideAfterSale(@PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(adminService.decideAfterSale(id, Maps.mutable(request)), "After-sales decision updated");
  }

  private String status(Map<String, Object> request) {
    return Maps.stringValue(request.get("status"), "").trim();
  }
}
