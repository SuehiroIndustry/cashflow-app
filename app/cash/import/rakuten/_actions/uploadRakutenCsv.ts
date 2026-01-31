// app/cash/import/rakuten/_actions/uploadRakutenCsv.ts
"use server";

export async function uploadRakutenCsv(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("ファイルが見つかりません");
  }

  console.log("==== Rakuten CSV Upload ====");
  console.log("name:", file.name);
  console.log("size:", file.size);
  console.log("type:", file.type);

  // 今日はここまででOK
  return { success: true };
}