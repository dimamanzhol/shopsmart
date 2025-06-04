import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Удаляем все товары (они удалятся автоматически через cascade)
    const { error: itemsError } = await supabase
      .from("shopping_items")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Удаляем все записи

    if (itemsError) {
      console.error("Ошибка удаления товаров:", itemsError);
    }

    // Удаляем все списки
    const { error: listsError } = await supabase
      .from("shopping_lists")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Удаляем все записи

    if (listsError) {
      console.error("Ошибка удаления списков:", listsError);
      return NextResponse.json(
        { error: "Ошибка очистки данных" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Все данные успешно очищены",
      success: true,
    });
  } catch (error) {
    console.error("Ошибка очистки данных:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
