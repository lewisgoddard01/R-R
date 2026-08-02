"use client";

export function ConfirmButton({
  children,
  confirmText,
  className,
  formAction,
}: {
  children: React.ReactNode;
  confirmText: string;
  className?: string;
  formAction?: (formData: FormData) => void;
}) {
  return (
    <button
      type="submit"
      className={className}
      formAction={formAction}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
