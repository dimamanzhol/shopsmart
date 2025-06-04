import { SignIn } from "@clerk/nextjs";

const SignInPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Добро пожаловать в ShopSmart
          </h1>
          <p className="text-gray-600">
            Войдите в свой аккаунт для доступа к спискам покупок
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary:
                "bg-gray-900 hover:bg-gray-800 text-sm normal-case",
              card: "bg-white shadow-lg border border-gray-200",
              headerTitle: "text-gray-900",
              headerSubtitle: "text-gray-600",
              socialButtonsIconButton:
                "border border-gray-300 hover:bg-gray-50",
              formFieldInput:
                "border border-gray-300 focus:border-gray-400 focus:ring-gray-400",
              footerActionLink: "text-gray-900 hover:text-gray-700",
            },
          }}
        />
      </div>
    </div>
  );
};

export default SignInPage;
