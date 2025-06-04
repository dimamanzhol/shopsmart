-- Добавляем поле created_by в таблицу shopping_lists
ALTER TABLE shopping_lists 
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Создаем индекс для лучшей производительности при фильтрации по пользователю
CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_by 
ON shopping_lists(created_by);

-- Комментарий к новому полю
COMMENT ON COLUMN shopping_lists.created_by IS 'ID пользователя из Clerk, который создал список';

-- Обновляем существующие записи, если они есть (можно оставить NULL для старых записей)
-- Это позволит существующим спискам работать, но они не будут привязаны к пользователю

-- Если вы хотите удалить старые записи без created_by, раскомментируйте следующую строку:
-- DELETE FROM shopping_lists WHERE created_by IS NULL; 