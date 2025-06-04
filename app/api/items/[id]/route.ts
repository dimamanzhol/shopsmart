import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "../../../lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    // Валидация UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Некорректный формат ID товара" },
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

    const { text, purchased, price } = body;

    // Валидация данных для обновления
    const updateData: any = {};

    // Валидация и добавление текста
    if (text !== undefined) {
      if (typeof text !== "string" || text.trim().length === 0) {
        return NextResponse.json(
          { error: "Текст товара должен быть непустой строкой" },
          { status: 400 }
        );
      }
      if (text.trim().length > 500) {
        return NextResponse.json(
          { error: "Текст товара не может быть длиннее 500 символов" },
          { status: 400 }
        );
      }
      updateData.text = text.trim();
    }

    // Валидация и добавление статуса покупки
    if (purchased !== undefined) {
      if (typeof purchased !== "boolean") {
        return NextResponse.json(
          { error: "Статус покупки должен быть булевым значением" },
          { status: 400 }
        );
      }
      updateData.purchased = purchased;
    }

    // Валидация и добавление цены
    if (price !== undefined) {
      if (price !== null && (typeof price !== "number" || price < 0)) {
        return NextResponse.json(
          { error: "Цена должна быть положительным числом или null" },
          { status: 400 }
        );
      }
      updateData.price = price;
    }

    // Проверяем, что есть что обновлять
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Нет данных для обновления" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Проверяем доступ к товару через список
    const { data: itemWithList, error: accessError } = await supabase
      .from("shopping_items")
      .select(
        `
        id,
        list_id,
        shopping_lists!inner(
          id,
          created_by,
          is_public,
          allow_anonymous_edit
        )
      `
      )
      .eq("id", id)
      .single();

    if (accessError || !itemWithList) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    // Проверяем права доступа
    const list = itemWithList.shopping_lists as any;
    const isOwner = userId && list.created_by === userId;
    const isPublicEditable = list.is_public && list.allow_anonymous_edit;

    if (!isOwner && !isPublicEditable) {
      return NextResponse.json(
        {
          error: userId
            ? "Нет прав для редактирования этого товара"
            : "Необходима авторизация",
        },
        { status: userId ? 403 : 401 }
      );
    }

    // Добавляем updated_at
    updateData.updated_at = new Date().toISOString();

    const { data: updatedItem, error } = await supabase
      .from("shopping_items")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Ошибка обновления товара:", error);
      return NextResponse.json(
        { error: "Ошибка обновления товара" },
        { status: 500 }
      );
    }

    // Обновляем время изменения списка
    await supabase
      .from("shopping_lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", itemWithList.list_id);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Неожиданная ошибка:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    // Валидация UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Некорректный формат ID товара" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Получаем товар с информацией о списке для проверки прав
    const { data: itemWithList, error: accessError } = await supabase
      .from("shopping_items")
      .select(
        `
        id,
        list_id,
        shopping_lists!inner(
          id,
          created_by,
          is_public,
          allow_anonymous_edit
        )
      `
      )
      .eq("id", id)
      .single();

    if (accessError || !itemWithList) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    // Проверяем права доступа
    const list = itemWithList.shopping_lists as any;
    const isOwner = userId && list.created_by === userId;
    const isPublicEditable = list.is_public && list.allow_anonymous_edit;

    if (!isOwner && !isPublicEditable) {
      return NextResponse.json(
        {
          error: userId
            ? "Нет прав для удаления этого товара"
            : "Необходима авторизация",
        },
        { status: userId ? 403 : 401 }
      );
    }

    // Удаляем товар
    const { error: deleteError } = await supabase
      .from("shopping_items")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Ошибка удаления товара:", deleteError);
      return NextResponse.json(
        { error: "Ошибка удаления товара" },
        { status: 500 }
      );
    }

    // Обновляем время изменения списка
    await supabase
      .from("shopping_lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", itemWithList.list_id);

    return NextResponse.json({
      message: "Товар успешно удален",
      id: id,
    });
  } catch (error) {
    console.error("Неожиданная ошибка:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
