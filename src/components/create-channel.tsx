"use client";

import { Field, Label } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "~/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "~/components/dialog";
import { Input } from "~/components/input";
import { trpc } from "~/lib/trpc";

export function CreateChannelDialog() {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const router = useRouter();
  const mutation = trpc.room.create.useMutation({
    onSuccess: (id) => {
      router.push(`/chat/${id}`);
      router.refresh();
    },
    onError(err) {
      setError(err.message);
    },
  });

  return (
    <>
      <Button size="icon" className="!size-8" onClick={() => setOpen(true)}>
        <PlusIcon className="size-5" />
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setError("");
        }}
      >
        <DialogTitle>Create New Channel</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = new FormData(e.currentTarget).get("name") as string;
            mutation.mutate({ name });
          }}
        >
          <DialogBody>
            <Field>
              <Label className="text-sm/6 font-medium">Name</Label>
              <Input
                type="text"
                name="name"
                placeholder="general"
                className="w-full"
              />
              {error && (
                <Label className="text-sm/6 font-medium text-red-600 dark:text-red-600">
                  {error}
                </Label>
              )}
            </Field>
          </DialogBody>
          <DialogActions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={mutation.isPending}
            >
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
