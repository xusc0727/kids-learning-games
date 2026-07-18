import { getPool } from "./database.mjs";

function mapCharacterRow(row) {
  return {
    id: row.character_key,
    character: row.character_value,
    pinyin: row.pinyin,
    word: row.example_word,
    sentence: row.example_sentence,
    hint: row.memory_hint,
    theme: row.theme,
    themeLabel: row.theme_label,
    icon: row.icon,
    difficulty: Number(row.difficulty),
  };
}

export async function upsertLiteracyCharacters(characters, connection) {
  const pool = connection || await getPool();
  let count = 0;
  for (const [index, item] of characters.entries()) {
    await pool.execute(
      `INSERT INTO literacy_characters
        (character_key, character_value, pinyin, example_word, example_sentence, memory_hint,
         theme, theme_label, icon, difficulty, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE
         character_value = VALUES(character_value), pinyin = VALUES(pinyin),
         example_word = VALUES(example_word), example_sentence = VALUES(example_sentence),
         memory_hint = VALUES(memory_hint), theme = VALUES(theme), theme_label = VALUES(theme_label),
         icon = VALUES(icon), difficulty = VALUES(difficulty), sort_order = VALUES(sort_order), status = 'active'`,
      [item.id, item.character, item.pinyin, item.word, item.sentence, item.hint, item.theme, item.themeLabel, item.icon, item.difficulty, index + 1],
    );
    count += 1;
  }
  return count;
}

export async function listLiteracyCharacters() {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT character_key, character_value, pinyin, example_word, example_sentence,
            memory_hint, theme, theme_label, icon, difficulty
     FROM literacy_characters
     WHERE status = 'active'
     ORDER BY sort_order, id`,
  );
  return rows.map(mapCharacterRow);
}
