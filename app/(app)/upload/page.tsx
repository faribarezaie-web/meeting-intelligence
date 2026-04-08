"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link2, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.type.startsWith("audio/") || dropped.name.endsWith(".mp3") || dropped.name.endsWith(".wav") || dropped.name.endsWith(".m4a"))) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^.]+$/, ""));
    } else {
      toast.error("Please upload an audio file (MP3, WAV, M4A)");
    }
  }, [title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a file");
    if (!title.trim()) return toast.error("Please enter a title");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      toast.success("Recording uploaded! Processing started.");
      router.push(`/meetings/${data.meetingId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return toast.error("Please enter a YouTube URL");
    if (!title.trim()) return toast.error("Please enter a title");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("youtubeUrl", youtubeUrl.trim());
      formData.append("title", title.trim());

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Failed to start processing");

      toast.success("YouTube meeting queued for processing.");
      router.push(`/meetings/${data.meetingId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Recording</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Upload an audio file or paste a YouTube URL to transcribe and extract tasks
        </p>
      </div>

      <Tabs defaultValue="file">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="file" className="gap-2 data-[state=active]:bg-zinc-800">
            <Mic className="h-4 w-4" />
            Audio File
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-2 data-[state=active]:bg-zinc-800">
            <Link2 className="h-4 w-4" />
            YouTube URL
          </TabsTrigger>
        </TabsList>

        {/* File Upload Tab */}
        <TabsContent value="file" className="mt-4">
          <form onSubmit={handleFileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title-file">Meeting Title</Label>
              <Input
                id="title-file"
                placeholder="Q4 Planning Session"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-zinc-900 border-zinc-700 focus:border-violet-500"
              />
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-violet-500 bg-violet-500/10"
                  : file
                  ? "border-emerald-600 bg-emerald-500/5"
                  : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className={cn("h-10 w-10 mx-auto mb-3", file ? "text-emerald-400" : "text-zinc-600")} />
              {file ? (
                <div>
                  <p className="font-medium text-emerald-400">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-zinc-300">Drop your audio file here</p>
                  <p className="text-xs text-zinc-500 mt-1">MP3, WAV, M4A up to 25 MB</p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={uploading || !file}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="mt-4">
          <form onSubmit={handleYoutubeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title-yt">Meeting Title</Label>
              <Input
                id="title-yt"
                placeholder="Team Standup — Jan 15"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-zinc-900 border-zinc-700 focus:border-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="bg-zinc-900 border-zinc-700 focus:border-violet-500"
              />
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="py-3 px-4">
                <p className="text-xs text-zinc-400">
                  The video must be public or unlisted. Private videos are not accessible.
                </p>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={uploading || !youtubeUrl.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Process YouTube Recording
                </>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
