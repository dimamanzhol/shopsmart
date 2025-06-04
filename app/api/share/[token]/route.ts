import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { token } = await params;

    // Валидация токена (hex строка)
    const hexRegex = /^[a-f0-9]{32}$/i;
    if (!hexRegex.test(token)) {
      return NextResponse.json(
        { error: "Некорректный формат токена" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Ищем публичный список по токену
    const { data: list, error: listError } = await supabase
      .from("shopping_lists")
      .select(
        `
        id,
        name,
        created_at,
        updated_at,
        is_public,
        share_token,
        allow_anonymous_edit,
        shopping_items (
          id,
          text,
          purchased,
          price,
          created_at,
          updated_at
        )
      `
      )
      .eq("share_token", token)
      .eq("is_public", true)
      .single();

    if (listError) {
      if (listError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Список не найден или не является публичным" },
          { status: 404 }
        );
      }
      console.error("Ошибка при получении публичного списка:", listError);
      return NextResponse.json(
        { error: "Ошибка при получении списка" },
        { status: 500 }
      );
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("Неожиданная ошибка:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
