"use client";

import { ChevronRight, Copy, LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { shortenAddress } from "@/lib/format";

export function WalletButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  if (isConnected && address) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className={fullWidth ? "w-full" : undefined}>
            {shortenAddress(address)}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Wallet connected</DialogTitle>
            <DialogDescription>
              Manage your active EVM wallet connection for Agora.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">
                  Active address
                </p>
                <p className="mt-2 font-mono text-sm text-foreground">
                  {shortenAddress(address)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await navigator.clipboard.writeText(address);
                }}
                aria-label="Copy wallet address"
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            <LogOut className="size-4" />
            Disconnect wallet
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  const availableConnectors = connectors
    .filter((connector) => connector.type === "injected" || Boolean(connector.name))
    .filter(
      (connector, index, items) =>
        items.findIndex((item) => item.uid === connector.uid) === index,
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={fullWidth ? "w-full" : undefined}>
          <Wallet className="size-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose an EVM wallet</DialogTitle>
          <DialogDescription>
            Connect with any detected injected wallet, including MetaMask, Rabby,
            Coinbase Wallet, OKX, and other browser-injected EVM wallets.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {availableConnectors.length === 0 ? (
            <div className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted">
              No injected EVM wallet detected in this browser.
            </div>
          ) : null}
          {availableConnectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/5 disabled:opacity-40"
              onClick={() => {
                connect({ connector });
                setOpen(false);
              }}
              disabled={isPending}
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {connector.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {connector.type === "injected"
                    ? "Browser-injected EVM wallet"
                    : connector.type}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                {isPending ? "Connecting" : "Select"}
                <ChevronRight className="size-4" />
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
