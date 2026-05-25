"use client";

import { useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteUpload, clearAllHistory } from "@/app/actions/telemetry";

export function DeleteRowButton({ uploadId }: { uploadId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="icon"
      title="Excluir este arquivo"
      disabled={isPending}
      onClick={() => startTransition(() => deleteUpload(uploadId))}
    >
      <Trash2 size={16} />
    </Button>
  );
}

export function ClearAllButton() {
  const [isPending, startTransition] = useTransition();

  const handleClear = () => {
    if (
      confirm(
        "Tem certeza que deseja apagar TODOS os dados e arquivos do Dashboard? Essa ação não pode ser desfeita.",
      )
    ) {
      startTransition(() => clearAllHistory());
    }
  };

  return (
    <Button
      variant="outline"
      className="text-red-500 border-red-200 hover:bg-red-50"
      disabled={isPending}
      onClick={handleClear}
    >
      <AlertTriangle size={16} className="mr-2" />
      {isPending ? "Limpando..." : "Limpar Tudo"}
    </Button>
  );
}
