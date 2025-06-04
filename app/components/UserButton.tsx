import { UserButton as ClerkUserButton, useUser } from "@clerk/nextjs";

const UserButton = () => {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:block text-sm text-gray-600">
        Привет, {user.firstName || user.emailAddresses[0]?.emailAddress}!
      </div>
      <ClerkUserButton
        appearance={{
          elements: {
            avatarBox: "w-8 h-8",
            userButtonPopoverCard: "bg-white shadow-lg border border-gray-200",
            userButtonPopoverActionButton: "text-gray-700 hover:bg-gray-50",
            userButtonPopoverActionButtonText: "text-sm",
            userButtonPopoverFooter: "hidden",
          },
        }}
        afterSignOutUrl="/sign-in"
      />
    </div>
  );
};

export default UserButton;
