import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "../../../../lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { userId } = await auth();
    const { id: listId } = await params;

    // Валидация UUID списка
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(listId)) {
      return NextResponse.json(
        { error: "Некорректный формат ID списка" },
        { status: 400 }
      );
    }

    // Безопасная обработка JSON
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Некорректный формат JSON" },
        { status: 400 }
      );
    }

    const { text, price } = body;

    // Валидация текста товара
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Название товара обязательно и должно быть непустой строкой" },
        { status: 400 }
      );
    }

    if (text.trim().length > 500) {
      return NextResponse.json(
        { error: "Название товара не может быть длиннее 500 символов" },
        { status: 400 }
      );
    }

    // Валидация цены
    if (price !== undefined && price !== null) {
      if (typeof price !== "number" || price < 0 || price > 999999.99) {
        return NextResponse.json(
          { error: "Цена должна быть положительным числом не более 999999.99" },
          { status: 400 }
        );
      }
    }

    // Проверяем доступ к списку
    const { data: listAccess, error: listError } = await supabase
      .from("shopping_lists")
      .select("id, created_by, is_public, allow_anonymous_edit")
      .eq("id", listId)
      .single();

    if (listError) {
      if (listError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Список не найден" },
          { status: 404 }
        );
      }
      console.error("Ошибка проверки списка:", listError);
      return NextResponse.json(
        { error: "Ошибка проверки списка" },
        { status: 500 }
      );
    }

    // Проверяем права доступа
    const isOwner = userId && listAccess.created_by === userId;
    const isPublicEditable =
      listAccess.is_public && listAccess.allow_anonymous_edit;

    if (!isOwner && !isPublicEditable) {
      return NextResponse.json(
        {
          error: userId
            ? "Нет прав доступа к этому списку"
            : "Необходима авторизация",
        },
        { status: userId ? 403 : 401 }
      );
    }

    // Получаем максимальную позицию для нового товара
    const { data: maxPositionData, error: positionError } = await supabase
      .from("shopping_items")
      .select("position")
      .eq("list_id", listId)
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) {
      console.error("Ошибка получения позиции:", positionError);
      return NextResponse.json(
        { error: "Ошибка создания товара" },
        { status: 500 }
      );
    }

    const nextPosition = (maxPositionData?.[0]?.position || 0) + 1;

    // Создаем товар
    const { data: newItem, error } = await supabase
      .from("shopping_items")
      .insert([
        {
          list_id: listId,
          text: text.trim(),
          price: price || null,
          position: nextPosition,
        },
      ])
      .select("*")
      .single();

    if (error) {
      console.error("Ошибка создания товара:", error);
      return NextResponse.json(
        { error: "Ошибка создания товара" },
        { status: 500 }
      );
    }

    // Обновляем время изменения списка
    await supabase
      .from("shopping_lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", listId);

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Неожиданная ошибка:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
};
