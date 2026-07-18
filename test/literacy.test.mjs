import assert from "node:assert/strict";
import test from "node:test";
import { LITERACY_CHARACTERS } from "../database/literacy-characters.mjs";

test("识字首版提供五个主题共三十个汉字", () => {
  assert.equal(LITERACY_CHARACTERS.length, 30);
  for (const theme of ["nature", "animals", "body", "family", "space"]) {
    assert.equal(LITERACY_CHARACTERS.filter((item) => item.theme === theme).length, 6);
  }
});

test("每个识字内容都有完整且唯一的学习信息", () => {
  const ids = new Set();
  const characters = new Set();
  for (const item of LITERACY_CHARACTERS) {
    assert.ok(item.id && item.character && item.pinyin && item.word);
    assert.ok(item.sentence && item.hint && item.themeLabel && item.icon);
    assert.equal([...item.character].length, 1);
    assert.equal(ids.has(item.id), false);
    assert.equal(characters.has(item.character), false);
    ids.add(item.id);
    characters.add(item.character);
  }
});
