-- 童趣成长乐园：应用账号授权脚本
-- 数据库：playmori
-- 账号：playmori_app@'%'
--
-- 执行前请确认账号实际 Host。若 RDS 中不是 %，请把下面两处 %
-- 修改为账号创建时使用的 Host，否则 MySQL 会提示账号不存在。

GRANT
  SELECT,
  INSERT,
  UPDATE,
  DELETE,
  CREATE,
  ALTER,
  INDEX,
  REFERENCES
ON `playmori`.*
TO 'playmori_app'@'%';

-- GRANT 执行后会立即生效，不需要执行 FLUSH PRIVILEGES。
-- 查看最终权限，确认授权对象和权限范围正确。
SHOW GRANTS FOR 'playmori_app'@'%';

-- 当前脚本遵循最小权限原则，没有授予：
-- 1. DROP：删除数据库或整张表；
-- 2. GRANT OPTION：继续向其他账号授权；
-- 3. 全局 *.* 权限。
-- 如果后续某个已评审的迁移确实需要删除整张表，再临时单独授予 DROP，
-- 迁移完成后及时收回，不建议长期保留。
