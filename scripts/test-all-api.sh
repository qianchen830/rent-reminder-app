#!/bin/bash
# 收租提醒 API 全功能自动化测试

BASE_URL="http://localhost:3003"
API_URL="http://localhost:3002"
ADMIN_USER="admin"
ADMIN_PASS="admin123"
TEST_USER="testuser"
TEST_PASS="test123456"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC}  $1"; ((passed++)); }
fail() { echo -e "${RED}❌ FAIL${NC}  $1"; echo "   响应: $2"; ((failed++)); }
info() { echo -e "${BLUE}ℹ️  INFO${NC}  $1"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC}  $1"; }

passed=0
failed=0
admin_token=""
test_user_id=""
test_token=""
property1_id=""
property2_id=""
contract1_id=""
contract2_id=""
bill1_id=""
deposit1_id=""

echo ""
echo "========================================"
echo "  收租提醒 API 全功能自动化测试"
echo "========================================"
echo ""

# ── 1. 健康检查 ──────────────────────────────────
info "1️⃣ 健康检查"
health=$(curl -s "$API_URL/api/health")
if echo "$health" | grep -q '"success":true'; then
  pass "健康检查"
else
  fail "健康检查" "$health"
fi

# ── 2. 登录获取 token ──────────────────────────────────
info "2️⃣ 管理员登录"
login=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")
admin_token=$(echo "$login" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$admin_token" ]; then
  pass "管理员登录成功，获取 token"
else
  fail "管理员登录" "$login"
fi

# ── 3. 获取当前用户信息 ──────────────────────────────────
info "3️⃣ 获取当前用户信息"
me=$(curl -s "$API_URL/api/auth/me" -H "Authorization: Bearer $admin_token")
if echo "$me" | grep -q '"success":true'; then
  pass "获取当前用户信息"
else
  fail "获取当前用户信息" "$me"
fi

# ── 4. 用户管理 - 获取用户列表 ──────────────────────────────────
info "4️⃣ 用户管理 - 获取用户列表"
users=$(curl -s "$API_URL/api/users" -H "Authorization: Bearer $admin_token")
if echo "$users" | grep -q '"success":true'; then
  pass "获取用户列表"
else
  fail "获取用户列表" "$users"
fi

# ── 5. 用户管理 - 创建测试用户 ──────────────────────────────────
info "5️⃣ 用户管理 - 创建测试用户"
new_user=$(curl -s -X POST "$API_URL/api/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $admin_token" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\",\"role\":\"user\"}")
test_user_id=$(echo "$new_user" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if echo "$new_user" | grep -q '"success":true'; then
  pass "创建测试用户"
else
  fail "创建测试用户" "$new_user"
fi

# ── 6. 测试用户登录 ──────────────────────────────────
info "6️⃣ 测试用户登录"
test_login=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")
test_token=$(echo "$test_login" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$test_token" ]; then
  pass "测试用户登录成功"
else
  fail "测试用户登录" "$test_login"
fi

# ── 7. 测试用户注册（重复用户名应失败） ──────────────────────────────────
info "7️⃣ 用户注册 - 重复用户名（应失败）"
dup_reg=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")
if echo "$dup_reg" | grep -q '"success":false'; then
  pass "重复用户名拒绝注册"
else
  fail "重复用户名拒绝注册" "$dup_reg"
fi

# ── 8. 房源管理 - 创建房源1 ──────────────────────────────────
info "8️⃣ 房源管理 - 创建房源A"
prop1=$(curl -s -X POST "$API_URL/api/properties" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $admin_token" \
  -d '{"name":"测试房源-张三","address":"北京市朝阳区","remark":"测试备注"}')
property1_id=$(echo "$prop1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if echo "$prop1" | grep -q '"success":true'; then
  pass "创建房源A: 测试房源-张三"
else
  fail "创建房源A" "$prop1"
fi

# ── 9. 房源管理 - 创建房源2 ──────────────────────────────────
info "9️⃣ 房源管理 - 创建房源B"
prop2=$(curl -s -X POST "$API_URL/api/properties" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $admin_token" \
  -d '{"name":"测试房源-李四","address":"上海市浦东新区","remark":""}')
property2_id=$(echo "$prop2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if echo "$prop2" | grep -q '"success":true'; then
  pass "创建房源B: 测试房源-李四"
else
  fail "创建房源B" "$prop2"
fi

# ── 10. 房源管理 - 获取房源列表 ──────────────────────────────────
info "🔟 房源管理 - 获取房源列表"
props=$(curl -s "$API_URL/api/properties" -H "Authorization: Bearer $admin_token")
if echo "$props" | grep -q '"success":true'; then
  count=$(echo "$props" | grep -o '"id":"[^"]*"' | wc -l)
  pass "获取房源列表 (共 $count 个)"
else
  fail "获取房源列表" "$props"
fi

# ── 11. 房源管理 - 更新房源 ──────────────────────────────────
info "1️⃣1️⃣ 房源管理 - 更新房源"
if [ -n "$property1_id" ]; then
  upd_prop=$(curl -s -X POST "$API_URL/api/properties/$property1_id" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $admin_token" \
    -d '{"name":"测试房源-张三-已更新","address":"北京市朝阳区望京","remark":"更新后的备注"}')
  if echo "$upd_prop" | grep -q '"success":true'; then
    pass "更新房源信息"
  else
    fail "更新房源" "$upd_prop"
  fi
else
  warn "跳过更新房源（无property1_id）"
fi

# ── 12. 合同管理 - 创建合同1（月付） ──────────────────────────────────
info "1️⃣2️⃣ 合同管理 - 创建月付合同"
today=$(date +%Y-%m-%d)
next_year=$(date -d "+1 year" +%Y-%m-%d)
contract1=$(curl -s -X POST "$API_URL/api/contracts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $admin_token" \
  -d "{\"propertyId\":\"$property1_id\",\"propertyName\":\"测试房源-张三-已更新\",\"tenantName\":\"租客张三\",\"tenantPhone\":\"13800138001\",\"rentAmount\":5000,\"depositAmount\":10000,\"paymentCycle\":\"monthly\",\"startDate\":\"$today\",\"endDate\":\"$next_year\"}")
contract1_id=$(echo "$contract1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if echo "$contract1" | grep -q '"success":true'; then
  pass "创建月付合同（租金5000元）"
else
  fail "创建月付合同" "$contract1"
fi

# ── 13. 合同管理 - 创建合同2（季付） ──────────────────────────────────
info "1️⃣3️⃣ 合同管理 - 创建季付合同"
contract2=$(curl -s -X POST "$API_URL/api/contracts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $admin_token" \
  -d "{\"propertyId\":\"$property2_id\",\"propertyName\":\"测试房源-李四\",\"tenantName\":\"租客李四\",\"tenantPhone\":\"13800138002\",\"rentAmount\":8000,\"depositAmount\":16000,\"paymentCycle\":\"quarterly\",\"startDate\":\"$today\",\"endDate\":\"$next_year\"}")
contract2_id=$(echo "$contract2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if echo "$contract2" | grep -q '"success":true'; then
  pass "创建季付合同（租金8000元）"
else
  fail "创建季付合同" "$contract2"
fi

# ── 14. 合同管理 - 获取合同列表 ──────────────────────────────────
info "1️⃣4️⃣ 合同管理 - 获取合同列表"
contracts=$(curl -s "$API_URL/api/contracts" -H "Authorization: Bearer $admin_token")
if echo "$contracts" | grep -q '"success":true'; then
  count=$(echo "$contracts" | grep -o '"id":"[^"]*"' | wc -l)
  pass "获取合同列表 (共 $count 个)"
else
  fail "获取合同列表" "$contracts"
fi

# ── 15. 账单管理 - 获取账单列表（自动生成的） ──────────────────────────────────
info "1️⃣5️⃣ 账单管理 - 获取账单列表"
bills=$(curl -s "$API_URL/api/bills" -H "Authorization: Bearer $admin_token")
if echo "$bills" | grep -q '"success":true'; then
  count=$(echo "$bills" | grep -o '"id":"[^"]*"' | wc -l)
  pass "获取账单列表 (共 $count 个，自动生成)"
else
  fail "获取账单列表" "$bills"
fi

# ── 16. 账单管理 - 标记账单为已支付 ──────────────────────────────────
info "1️⃣6️⃣ 账单管理 - 标记账单为已支付"
if [ -n "$contract1_id" ]; then
  # 找一个未支付的账单
  pending_bill=$(curl -s "$API_URL/api/bills" -H "Authorization: Bearer $admin_token")
  bill_id=$(echo "$pending_bill" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$bill_id" ]; then
    pay=$(curl -s -X POST "$API_URL/api/bills/$bill_id/pay" -H "Authorization: Bearer $admin_token")
    if echo "$pay" | grep -q '"success":true'; then
      pass "标记账单为已支付"
    else
      fail "标记账单为已支付" "$pay"
    fi
  else
    warn "无可支付账单"
  fi
fi

# ── 17. 押金管理 - 创建押金记录 ──────────────────────────────────
info "1️⃣7️⃣ 押金管理 - 创建押金记录"
if [ -n "$contract1_id" ]; then
  deposit=$(curl -s -X POST "$API_URL/api/deposits" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $admin_token" \
    -d "{\"contractId\":\"$contract1_id\",\"propertyId\":\"$property1_id\",\"propertyName\":\"测试房源-张三-已更新\",\"tenantName\":\"租客张三\",\"amount\":10000,\"status\":\"held\",\"remark\":\"押金记录\"}")
  deposit1_id=$(echo "$deposit" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if echo "$deposit" | grep -q '"success":true'; then
    pass "创建押金记录（10000元）"
  else
    fail "创建押金记录" "$deposit"
  fi
fi

# ── 18. 押金管理 - 获取押金列表 ──────────────────────────────────
info "1️⃣8️⃣ 押金管理 - 获取押金列表"
deposits=$(curl -s "$API_URL/api/deposits" -H "Authorization: Bearer $admin_token")
if echo "$deposits" | grep -q '"success":true'; then
  pass "获取押金列表"
else
  fail "获取押金列表" "$deposits"
fi

# ── 19. 押金管理 - 更新押金状态 ──────────────────────────────────
info "1️⃣9️⃣ 押金管理 - 更新押金状态"
if [ -n "$deposit1_id" ]; then
  upd_dep=$(curl -s -X POST "$API_URL/api/deposits/$deposit1_id" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $admin_token" \
    -d '{"status":"returned","remark":"租期结束退还押金"}')
  if echo "$upd_dep" | grep -q '"success":true'; then
    pass "更新押金状态为已退还"
  else
    fail "更新押金状态" "$upd_dep"
  fi
fi

# ── 20. 统计接口 ──────────────────────────────────
info "2️⃣0️⃣ 统计接口"
stats=$(curl -s "$API_URL/api/stats" -H "Authorization: Bearer $admin_token")
if echo "$stats" | grep -q '"success":true'; then
  totalPending=$(echo "$stats" | grep -o '"totalPending":[0-9.]*' | cut -d: -f2)
  pendingCount=$(echo "$stats" | grep -o '"pendingCount":[0-9]*' | cut -d: -f2)
  activeCount=$(echo "$stats" | grep -o '"activeCount":[0-9]*' | cut -d: -f2)
  pass "统计接口 (待收: ¥$totalPending, 待处理: $pendingCount, 活跃合同: $activeCount)"
else
  fail "统计接口" "$stats"
fi

# ── 21. 初始化示例数据（已有数据时应返回already initialized） ──────────────────────────────────
info "2️⃣1️⃣ 初始化示例数据"
init=$(curl -s -X POST "$API_URL/api/init-sample" -H "Authorization: Bearer $admin_token")
if echo "$init" | grep -q '"success":true'; then
  pass "初始化示例数据"
else
  fail "初始化示例数据" "$init"
fi

# ── 22. 合同管理 - 更新合同状态 ──────────────────────────────────
info "2️⃣2️⃣ 合同管理 - 更新合同状态"
if [ -n "$contract1_id" ]; then
  upd_contract=$(curl -s -X POST "$API_URL/api/contracts/$contract1_id" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $admin_token" \
    -d '{"propertyId":"'$property1_id'","propertyName":"测试房源-张三-已更新","tenantName":"租客张三","tenantPhone":"13800138001","rentAmount":5500,"depositAmount":10000,"paymentCycle":"monthly","startDate":"'$today'","endDate":"'$next_year'","status":"active"}')
  if echo "$upd_contract" | grep -q '"success":true'; then
    pass "更新合同信息（租金调为5500）"
  else
    fail "更新合同" "$upd_contract"
  fi
fi

# ── 23. 删除合同 ──────────────────────────────────
info "2️⃣3️⃣ 合同管理 - 删除合同2"
if [ -n "$contract2_id" ]; then
  del_contract=$(curl -s -X DELETE "$API_URL/api/contracts/$contract2_id" -H "Authorization: Bearer $admin_token")
  if echo "$del_contract" | grep -q '"success":true'; then
    pass "删除合同2"
  else
    fail "删除合同2" "$del_contract"
  fi
fi

# ── 24. 删除房源 ──────────────────────────────────
info "2️⃣4️⃣ 房源管理 - 删除房源2"
if [ -n "$property2_id" ]; then
  del_prop=$(curl -s -X DELETE "$API_URL/api/properties/$property2_id" -H "Authorization: Bearer $admin_token")
  if echo "$del_prop" | grep -q '"success":true'; then
    pass "删除房源2（级联删除关联合同/账单/押金）"
  else
    fail "删除房源2" "$del_prop"
  fi
fi

# ── 25. 权限测试 - 普通用户不能访问用户管理 ──────────────────────────────────
info "2️⃣5️⃣ 权限测试 - 普通用户不能访问用户管理"
if [ -n "$test_token" ]; then
  user_mgmt=$(curl -s "$API_URL/api/users" -H "Authorization: Bearer $test_token")
  if echo "$user_mgmt" | grep -q '"success":false'; then
    pass "普通用户无权访问用户管理"
  else
    fail "普通用户权限控制" "$user_mgmt"
  fi
fi

# ── 26. 权限测试 - 未授权访问 ──────────────────────────────────
info "2️⃣6️⃣ 权限测试 - 未授权访问"
no_auth=$(curl -s "$API_URL/api/properties")
if echo "$no_auth" | grep -q '"success":false'; then
  pass "未授权访问被拒绝"
else
  fail "未授权访问控制" "$no_auth"
fi

# ── 27. 权限测试 - 非法token ──────────────────────────────────
info "2️⃣7️⃣ 权限测试 - 非法token"
bad_token=$(curl -s "$API_URL/api/properties" -H "Authorization: Bearer invalid_token_12345")
if echo "$bad_token" | grep -q '"success":false'; then
  pass "非法token被拒绝"
else
  fail "非法token控制" "$bad_token"
fi

# ── 28. 用户管理 - 修改用户密码 ──────────────────────────────────
info "2️⃣8️⃣ 用户管理 - 修改用户密码"
if [ -n "$test_user_id" ]; then
  chg_pwd=$(curl -s -X PUT "$API_URL/api/users/$test_user_id/password" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $admin_token" \
    -d '{"password":"newpassword123"}')
  if echo "$chg_pwd" | grep -q '"success":true'; then
    pass "修改用户密码"
  else
    fail "修改用户密码" "$chg_pwd"
  fi
fi

# ── 29. 用户管理 - 删除测试用户 ──────────────────────────────────
info "2️⃣9️⃣ 用户管理 - 删除测试用户"
if [ -n "$test_user_id" ]; then
  del_user=$(curl -s -X DELETE "$API_URL/api/users/$test_user_id" -H "Authorization: Bearer $admin_token")
  if echo "$del_user" | grep -q '"success":true'; then
    pass "删除测试用户"
  else
    fail "删除测试用户" "$del_user"
  fi
fi

# ── 30. 用户管理 - 不能删除自己 ──────────────────────────────────
info "3️⃣0️⃣ 用户管理 - 管理员不能删除自己"
self_del=$(curl -s -X DELETE "$API_URL/api/users/admin" -H "Authorization: Bearer $admin_token")
if echo "$self_del" | grep -q '"success":false'; then
  pass "管理员不能删除自己"
else
  fail "管理员不能删除自己" "$self_del"
fi

# ── 前端页面检查 ──────────────────────────────────
info "3️⃣1️⃣ 前端页面检查"
frontend=$(curl -s "$BASE_URL/" | tr '\n' ' ')
if echo "$frontend" | grep -q "收租提醒"; then
  pass "前端页面正常加载"
else
  fail "前端页面" "$frontend"
fi

echo ""
echo "========================================"
echo "  测试汇总"
echo "========================================"
echo -e "  ${GREEN}✅ 通过: $passed${NC}"
echo -e "  ${RED}❌ 失败: $failed${NC}"
echo "  总计: $((passed + failed))"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！${NC}"
else
  echo -e "${RED}⚠️  有 $failed 项测试失败，请检查。${NC}"
fi
echo ""
