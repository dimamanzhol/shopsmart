import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerSupabaseClient } from "../../../lib/supabase";

// Инициализируем OpenAI (в продакшене нужно добавить OPENAI_API_KEY в env)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "demo-key",
});

interface SuggestRequest {
  type: "auto_complete" | "shopping_list" | "recipe_ingredients";
  query: string;
  listId?: string;
  existingItems?: string[];
}

export async function POST(request: NextRequest) {
  let requestData: SuggestRequest | null = null;

  try {
    // Сначала парсим запрос
    requestData = await request.json();

    if (!requestData) {
      return NextResponse.json(
        { error: "Некорректный запрос" },
        { status: 400 }
      );
    }

    const { type, query, listId, existingItems = [] } = requestData;

    console.log("AI Request:", {
      type,
      query,
      listId,
      existingItems: existingItems.length,
    });

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Запрос не может быть пустым" },
        { status: 400 }
      );
    }

    // Получаем историю покупок пользователя для контекста
    let userHistory: string[] = [];
    if (listId) {
      try {
        const supabase = createServerSupabaseClient();
        const { data: historyData } = await supabase
          .from("shopping_items")
          .select("text")
          .limit(50)
          .order("created_at", { ascending: false });

        userHistory = historyData?.map((item) => item.text) || [];
      } catch (error) {
        console.error("Ошибка получения истории:", error);
      }
    }

    let prompt = "";
    let systemMessage = "";

    switch (type) {
      case "auto_complete":
        systemMessage = `Ты - умный помощник для списков покупок. 
        Предложи 3-5 релевантных товаров для добавления в список, основываясь на запросе пользователя.
        Учитывай историю покупок и уже добавленные товары.
        Отвечай ТОЛЬКО JSON массивом строк с названиями товаров на русском языке.
        Пример: ["молоко", "хлеб", "яйца"]`;

        prompt = `Запрос: "${query}"
        ${
          existingItems.length > 0
            ? `Уже в списке: ${existingItems.join(", ")}`
            : ""
        }
        ${
          userHistory.length > 0
            ? `История покупок: ${userHistory.slice(0, 20).join(", ")}`
            : ""
        }`;
        break;

      case "shopping_list":
        systemMessage = `Ты - умный помощник для списков покупок.
        Создай полный список покупок на основе описания пользователя.
        Отвечай ТОЛЬКО JSON массивом объектов с полями "text" и "category".
        Пример: [{"text": "молоко", "category": "молочные"}, {"text": "хлеб", "category": "хлебобулочные"}]`;

        prompt = `Создай список покупок для: "${query}"
        ${
          userHistory.length > 0
            ? `Учти мои предпочтения из истории: ${userHistory
                .slice(0, 15)
                .join(", ")}`
            : ""
        }`;
        break;

      case "recipe_ingredients":
        systemMessage = `Ты - кулинарный помощник. 
        Создай список ингредиентов для приготовления блюда.
        Включай точные количества где возможно.
        Отвечай ТОЛЬКО JSON массивом объектов с полями "text", "quantity" и "category".
        Пример: [{"text": "картофель", "quantity": "1 кг", "category": "овощи"}]`;

        prompt = `Список ингредиентов для блюда: "${query}"`;
        break;

      default:
        return NextResponse.json(
          { error: "Неподдерживаемый тип запроса" },
          { status: 400 }
        );
    }

    // Проверяем наличие API ключа
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "demo-key"
    ) {
      console.log("Using demo mode for AI suggestions");
      // Возвращаем демо-данные
      const demoSuggestions = getDemoSuggestions(type, query);
      return NextResponse.json({
        suggestions: demoSuggestions,
        isDemo: true,
        message: "Демо режим - добавьте OPENAI_API_KEY для полного функционала",
      });
    }

    // Запрос к OpenAI
    console.log("Making OpenAI request...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    console.log("OpenAI response:", aiResponse);

    if (!aiResponse) {
      throw new Error("Пустой ответ от AI");
    }

    // Парсим JSON ответ
    let suggestions;
    try {
      suggestions = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("Ошибка парсинга AI ответа:", aiResponse);
      // Возвращаем демо-данные при ошибке парсинга
      const demoSuggestions = getDemoSuggestions(type, query);
      return NextResponse.json({
        suggestions: demoSuggestions,
        isDemo: true,
        error: "Ошибка парсинга ответа AI, показаны демо-данные",
      });
    }

    return NextResponse.json({
      suggestions,
      isDemo: false,
    });
  } catch (error) {
    console.error("Ошибка AI API:", error);

    // В случае ошибки возвращаем демо-данные
    // Используем сохраненные данные запроса если они есть
    const type = requestData?.type || "shopping_list";
    const query = requestData?.query || "";

    const demoSuggestions = getDemoSuggestions(type, query);

    return NextResponse.json({
      suggestions: demoSuggestions,
      isDemo: true,
      error: "Ошибка AI сервиса, показаны демо-данные",
    });
  }
}

// Демо-данные для случаев когда нет API ключа или ошибка
function getDemoSuggestions(type: string, query: string) {
  const lowerQuery = query.toLowerCase();

  if (type === "auto_complete") {
    if (lowerQuery.includes("молок") || lowerQuery.includes("молоч")) {
      return ["молоко", "йогурт", "творог", "сметана"];
    }
    if (lowerQuery.includes("хлеб") || lowerQuery.includes("выпеч")) {
      return ["хлеб белый", "хлеб черный", "батон", "булочки"];
    }
    if (lowerQuery.includes("овощ") || lowerQuery.includes("салат")) {
      return ["помидоры", "огурцы", "лук", "морковь", "капуста"];
    }
    return ["хлеб", "молоко", "яйца", "масло"];
  }

  if (type === "shopping_list") {
    if (lowerQuery.includes("борщ")) {
      return [
        { text: "свекла", category: "овощи" },
        { text: "капуста", category: "овощи" },
        { text: "морковь", category: "овощи" },
        { text: "лук", category: "овощи" },
        { text: "мясо говядина", category: "мясо" },
        { text: "томатная паста", category: "консервы" },
        { text: "сметана", category: "молочные" },
      ];
    }
    if (lowerQuery.includes("завтрак") || lowerQuery.includes("утро")) {
      return [
        { text: "яйца", category: "основное" },
        { text: "хлеб", category: "хлебобулочные" },
        { text: "масло сливочное", category: "молочные" },
        { text: "кофе", category: "напитки" },
        { text: "молоко", category: "молочные" },
      ];
    }
    return [
      { text: "хлеб", category: "основное" },
      { text: "молоко", category: "молочные" },
      { text: "яйца", category: "основное" },
    ];
  }

  if (type === "recipe_ingredients") {
    if (lowerQuery.includes("омлет")) {
      return [
        { text: "яйца", quantity: "3 шт", category: "основное" },
        { text: "молоко", quantity: "50 мл", category: "молочные" },
        { text: "масло сливочное", quantity: "1 ст.л.", category: "молочные" },
        { text: "соль", quantity: "по вкусу", category: "специи" },
      ];
    }
    if (lowerQuery.includes("борщ")) {
      return [
        { text: "свекла", quantity: "2-3 шт", category: "овощи" },
        { text: "капуста", quantity: "300 г", category: "овощи" },
        { text: "морковь", quantity: "1 шт", category: "овощи" },
        { text: "лук", quantity: "1 шт", category: "овощи" },
        { text: "говядина", quantity: "500 г", category: "мясо" },
        { text: "томатная паста", quantity: "2 ст.л.", category: "консервы" },
        { text: "картофель", quantity: "3-4 шт", category: "овощи" },
        { text: "сметана", quantity: "для подачи", category: "молочные" },
      ];
    }
    if (lowerQuery.includes("паста") || lowerQuery.includes("спагетти")) {
      return [
        { text: "спагетти", quantity: "400 г", category: "макароны" },
        { text: "бекон", quantity: "200 г", category: "мясо" },
        { text: "яйца", quantity: "3 шт", category: "основное" },
        { text: "пармезан", quantity: "100 г", category: "сыры" },
        { text: "чеснок", quantity: "2 зубчика", category: "овощи" },
      ];
    }
    return [
      {
        text: "основной ингредиент",
        quantity: "по рецепту",
        category: "основное",
      },
    ];
  }

  return [];
}
