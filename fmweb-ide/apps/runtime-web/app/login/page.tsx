"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, Heading, Input, Text } from "@fmweb/ui";

import { runtimeLogin, runtimeLogout } from "@/lib/runtime-api";

export default function RuntimeLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("runtime");
  const [password, setPassword] = useState("runtime");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    try {
      await runtimeLogin(username, password);
      setMessage("Login successful");
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    }
  };

  const logout = async () => {
    try {
      await runtimeLogout();
      setMessage("Logged out");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logout failed");
    }
  };

  return (
    <main>
      <Card>
        <Heading level={2}>Runtime Login</Heading>
        <Text>Connector session uses an httpOnly cookie.</Text>

        <label>Username</label>
        <Input value={username} onChange={setUsername} />

        <label>Password</label>
        <Input type="password" value={password} onChange={setPassword} />

        <div style={{ display: "flex", gap: "8px" }}>
          <Button onClick={() => void submit()}>Login</Button>
          <Button onClick={() => void logout()}>Logout</Button>
        </div>

        {message !== null ? <Text>{message}</Text> : null}
      </Card>
    </main>
  );
}
