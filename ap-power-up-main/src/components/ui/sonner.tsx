import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg !text-[1.4rem] !p-[2.4rem] !min-w-[400px]",
          description: "group-[.toast]:text-muted-foreground !text-[1.4rem]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground !text-[1.4rem]",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground !text-[1.4rem]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
