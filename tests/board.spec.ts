import { expect, test } from '@playwright/test';

test('Попытка изменить поиск не сбрасывает новую задачу, а сохранение учитывает текущий фильтр', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox');
  await search.fill('Черновик');
  await page.getByRole('button', { name: '+ Добавить' }).click();
  const form = page.getByRole('form', { name: 'Новая задача' });
  const description = form.getByLabel('Описание:');
  await description.fill('Черновик новой задачи');

  await search.press('x');
  await expect(description).toHaveValue('Черновик новой задачи', { timeout: 2000 });
  await expect(search).toHaveValue('Черновик');

  await form.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('Черновик новой задачи', { exact: true })).toBeVisible();
  await expect(search).toBeEditable();
});

test('При редактировании черновик сохраняется до явной отмены', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox');
  await search.fill('Разработать план');
  const edit = page.getByRole('button', { name: /Редактировать задачу: Разработать план/ });
  await edit.focus();
  await edit.press('Enter');
  const form = page.getByRole('form', { name: 'Редактирование задачи' });
  const description = form.getByLabel('Описание:');
  const original = await description.inputValue();
  await description.fill('Несохранённое описание');

  await search.press('x');
  await expect(description).toHaveValue('Несохранённое описание', { timeout: 2000 });
  await expect(search).toHaveValue('Разработать план');

  await form.getByRole('button', { name: 'Отменить' }).click();
  await expect(page.getByText(original, { exact: true })).toBeVisible();
  await expect(edit).toBeFocused();
  await expect(search).toBeEditable();
});

test('Форма указывает на каждое ошибочное поле и позволяет исправить данные', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ Добавить' }).click();
  const form = page.getByRole('form', { name: 'Новая задача' });
  const description = form.getByLabel('Описание:');
  const start = form.getByLabel('Начало:');
  const end = form.getByLabel('Окончание:');
  const save = form.getByRole('button', { name: 'Сохранить' });
  const alert = form.getByRole('alert');

  for (const [field, invalidValue, message, correction] of [
    [description, ' ', 'Введите описание задачи.', 'Проверенная задача'],
    [start, '31.04.2024', 'Укажите существующую дату начала в формате дд.мм.гггг.', '29.04.2024'],
    [end, '31.04.2024', 'Укажите существующую дату окончания в формате дд.мм.гггг.', '28.04.2024'],
    [end, '28.04.2024', 'Окончание должно быть не раньше начала.', '30.04.2024'],
  ] as const) {
    await field.fill(invalidValue);
    await save.click();
    await expect(alert).toHaveText(message);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(message);
    await expect(field).toBeFocused();
    if (field === end && invalidValue === '31.04.2024') {
      await start.fill('30.04.2024');
      await expect(end).toHaveAccessibleDescription(message);
    }
    await field.fill(correction);
    await expect(alert).toHaveCount(0);
  }

  await save.click();
  await expect(page.getByText('Проверенная задача', { exact: true })).toBeVisible();
});

test('Просроченные незавершённые задачи отмечены видимым символом и доступным текстом', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-19T12:00:00Z'));
  await page.goto('/');
  const todo = page.getByRole('article').filter({ hasText: 'Разработать план по внедрению' });
  const done = page.getByRole('article').filter({ hasText: 'Завершить рефакторинг старого кода' });
  await expect(todo.getByText('⚠', { exact: true })).toBeVisible();
  expect(await todo.ariaSnapshot()).toContain('(просрочено)');
  await expect(done.getByText('⚠', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '+ Добавить' }).click();
  const form = page.getByRole('form', { name: 'Новая задача' });
  await form.getByLabel('Описание:').fill('Дедлайн сегодня');
  await form.getByRole('button', { name: 'Сохранить' }).click();
  const current = page.getByRole('article').filter({ hasText: 'Дедлайн сегодня' });
  await expect(current).toBeVisible();
  await expect(current.getByText('⚠', { exact: true })).toHaveCount(0);
});
