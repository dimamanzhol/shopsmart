import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "../../../lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Валидация UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Некорректный формат ID списка" },
        { status: 400 }
      );
    }

    // Проверяем что список принадлежит текущему пользователю
    const { data: list, error } = await supabase
      .from("shopping_lists")
      .select(
        `
        id,
        name,
        created_at,
        updated_at,
        created_by,
        is_public,
        allow_anonymous_edit,
        share_token,
        shopping_items(
          id,
          text,
          purchased,
          price,
          position,
          created_at,
          updated_at
        )
      `
      )
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Список не найден" },
          { status: 404 }
        );
      }
      console.error("Ошибка получения списка:", error);
      return NextResponse.json(
        { error: "Ошибка получения списка" },
        { status: 500 }
      );
    }

    // Сортируем товары по позиции
    if (list.shopping_items) {
      list.shopping_items.sort((a, b) => a.position - b.position);
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("Неожиданная ошибка:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
};

export const PUT = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Валидация UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
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

    const { name, isPublic, allowAnonymousEdit } = body;

    // Подготавливаем объект для обновления
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Если обновляется название
    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          {
            error: "Название списка обязательно и должно быть непустой строкой",
          },
          { status: 400 }
        );
      }

      if (name.trim().length > 255) {
        return NextResponse.json(
          { error: "Название списка не может быть длиннее 255 символов" },
          { status: 400 }
        );
      }

      updateData.name = name.trim();
    }

    // Если обновляются настройки публичности
    if (isPublic !== undefined) {
      if (typeof isPublic !== "boolean") {
        return NextResponse.json(
          { error: "isPublic должно быть boolean значением" },
          { status: 400 }
        );
      }
      updateData.is_public = isPublic;

      // Генерируем share_token если список становится публичным
      if (isPublic && !updateData.share_token) {
        updateData.share_token = crypto.randomUUID().replace(/-/g, "");
      }
    }

    // Если обновляются настройки редактирования
    if (allowAnonymousEdit !== undefined) {
      if (typeof allowAnonymousEdit !== "boolean") {
        return NextResponse.json(
          { error: "allowAnonymousEdit должно быть boolean значением" },
          { status: 400 }
        );
      }
      updateData.allow_anonymous_edit = allowAnonymousEdit;
    }

    // Проверяем, что хотя бы одно поле для обновления передано
    if (Object.keys(updateData).length === 1) {
      // только updated_at
      return NextResponse.json(
        { error: "Необходимо указать хотя бы одно поле для обновления" },
        { status: 400 }
      );
    }

    // Обновляем только если список принадлежит пользователю
    const { data: updatedList, error } = await supabase
      .from("shopping_lists")
      .update(updateData)
      .eq("id", id)
      .eq("created_by", userId)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Список не найден или у вас нет прав доступа" },
          { status: 404 }
        );
      }
      console.error("Ошибка обновления списка:", error);
      return NextResponse.json(
        { error: "Ошибка обновления списка" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("Неожиданная ошибка:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
};

export const DELETE = async (
  request: NextRequest,
  { params }: RouteContext
) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Валидация UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Некорректный формат ID списка" },
        { status: 400 }
      );
    }

    // Проверяем что список существует и принадлежит пользователю
    const { data: listExists, error: checkError } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Список не найден или у вас нет прав доступа" },
          { status: 404 }
        );
      }
      console.error("Ошибка проверки списка:", checkError);
      return NextResponse.json(
        { error: "Ошибка проверки списка" },
        { status: 500 }
      );
    }

    // Удаляем список (товары удалятся автоматически благодаря CASCADE)
    const { error: deleteError } = await supabase
      .from("shopping_lists")
      .delete()
      .eq("id", id)
      .eq("created_by", userId);

    if (deleteError) {
      console.error("Ошибка удаления списка:", deleteError);
      return NextResponse.json(
        { error: "Ошибка удаления списка" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Список успешно удален",
      id: id,
    });
  } catch (error) {
    console.error("Неожиданная ошибка:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
};
