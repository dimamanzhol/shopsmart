import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/app/lib/supabase";
import type { User } from "@clerk/nextjs/server";

export const GET = async (req: NextRequest) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем всех пользователей из Clerk
    const client = await clerkClient();
    const users = await client.users.getUserList({
      limit: 50,
      orderBy: "-created_at",
    });

    // Получаем статистику списков для каждого пользователя из Supabase
    const userAccounts = await Promise.all(
      users.data.map(async (user: User) => {
        // Подсчитываем количество списков для каждого пользователя
        const { count: listsCount } = await supabase
          .from("shopping_lists")
          .select("*", { count: "exact", head: true })
          .eq("created_by", user.id);

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddress: user.emailAddresses[0]?.emailAddress || "",
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt,
          listsCount: listsCount || 0,
        };
      })
    );

    return NextResponse.json(userAccounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
