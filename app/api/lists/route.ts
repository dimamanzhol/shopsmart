import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/app/lib/supabase";

interface ShoppingListItem {
  id: string;
  purchased: boolean;
}

interface ShoppingListWithItems {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  shopping_items: ShoppingListItem[];
}

export const GET = async (req: NextRequest) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");

    // Проверяем что пользователь запрашивает свои списки
    if (requestedUserId !== userId) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    // Получаем списки пользователя
    const { data: lists, error: listsError } = await supabase
      .from("shopping_lists")
      .select("*")
      .eq("created_by", userId)
      .order("updated_at", { ascending: false });

    if (listsError) {
      console.error("Error fetching lists:", listsError);
      return NextResponse.json(
        { error: "Ошибка получения списков" },
        { status: 500 }
      );
    }

    // Получаем статистику для каждого списка
    const listsWithStats = await Promise.all(
      lists.map(async (list) => {
        const { data: items } = await supabase
          .from("shopping_items")
          .select("purchased")
          .eq("list_id", list.id);

        const itemsCount = items?.length || 0;
        const completedCount =
          items?.filter((item) => item.purchased).length || 0;

        return {
          ...list,
          itemsCount,
          completedCount,
        };
      })
    );

    return NextResponse.json(listsWithStats);
  } catch (error) {
    console.error("Error in lists API:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name } = body;

    // Валидация названия списка
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Название списка обязательно и должно быть непустой строкой" },
        { status: 400 }
      );
    }

    if (name.trim().length > 255) {
      return NextResponse.json(
        { error: "Название списка не может быть длиннее 255 символов" },
        { status: 400 }
      );
    }

    // Проверка на дублирование названий (опционально)
    const { data: existingLists, error: checkError } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("created_by", userId)
      .eq("name", name.trim())
      .limit(1);

    if (checkError) {
      console.error("Error checking duplicate names:", checkError);
      return NextResponse.json(
        { error: "Ошибка проверки названия" },
        { status: 500 }
      );
    }

    if (existingLists && existingLists.length > 0) {
      return NextResponse.json(
        { error: "Список с таким названием уже существует" },
        { status: 409 }
      );
    }

    const { data: newList, error } = await supabase
      .from("shopping_lists")
      .insert({
        name: name.trim(),
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating list:", error);
      return NextResponse.json(
        { error: "Ошибка создания списка" },
        { status: 500 }
      );
    }

    return NextResponse.json(newList, { status: 201 });
  } catch (error) {
    console.error("Error in create list API:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
};
