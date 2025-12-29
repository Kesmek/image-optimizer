import { createSignal, For, onCleanup, type JSX } from "solid-js";
import { optimizeImage } from "wasm-image-optimization";

interface QueueItem {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "processing" | "done" | "error";
  result?: Blob;
  resultSize?: number;
}

type OutputType = "desktop" | "mobile" | "tablet" | "thumbnail" | "logo";

export default function ImageOptimizer() {
  const [files, setFiles] = createSignal<QueueItem[]>([]);
  const [outputType, setOutputType] = createSignal<OutputType>("desktop");

  const handleFiles: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const newFiles = e.currentTarget.files;
    if (!newFiles) return;

    const newItems: QueueItem[] = Array.from(newFiles)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: "pending",
      }));

    setFiles((prev) => [...prev, ...newItems]);
  };

  const handleOutputType: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    setOutputType(e.currentTarget.value as OutputType);
  };

  const removeFile = (id: string) => {
    const item = files().find((f) => f.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    files().forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
  };

  const processImage = async (item: QueueItem, preset: OutputType) => {
    const imageData = await item.file.arrayBuffer();
    let width = 0;

    switch (preset) {
      case "desktop":
        width = 1200;
        break;
      case "tablet":
        width = 800;
        break;
      case "mobile":
        width = 600;
        break;
      case "thumbnail":
        width = 400;
        break;
      case "logo":
        width = 250;
        break;
    }

    const result = await optimizeImage({
      image: imageData,
      format: "avif",
      quality: 80,
      width,
    });

    if (!result) throw new Error("Error processing image");

    return new Blob([result], { type: "image/avif" });
  };

  const processAllImages: JSX.EventHandler<HTMLFormElement, Event> = async () => {
    for (const item of files()) {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "processing" as const } : f)),
      );

      try {
        const result = await processImage(item, outputType());
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "done" as const, result, resultSize: result.size }
              : f,
          ),
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "error" as const } : f)),
        );
      }
    }
  };

  onCleanup(() => {
    files().forEach((f) => URL.revokeObjectURL(f.preview));
  });

  return (
    <div>
      <h1>Image Optimizer</h1>

      <form onsubmit={processAllImages}>
        <input type="file" multiple accept="image/*" onInput={handleFiles} />
        <fieldset>
          <div class="input-group">
            <label for="desktop">desktop</label>
            <input
              type="radio"
              id="desktop"
              name="output-type"
              value="desktop"
              onChange={handleOutputType}
            />
          </div>
          <div class="input-group">
            <label for="tablet">tablet</label>
            <input
              type="radio"
              id="tablet"
              name="output-type"
              value="tablet"
              onChange={handleOutputType}
            />
          </div>
          <div class="input-group">
            <label for="mobile">mobile</label>
            <input
              type="radio"
              id="mobile"
              name="output-type"
              value="mobile"
              onChange={handleOutputType}
            />
          </div>
          <div class="input-group">
            <label for="thumbnail">thumbnail</label>
            <input
              type="radio"
              id="thumbnail"
              name="output-type"
              value="thumbnail"
              onChange={handleOutputType}
            />
          </div>
          <div class="input-group">
            <label for="logo">logo</label>
            <input
              type="radio"
              id="logo"
              name="output-type"
              value="logo"
              onChange={handleOutputType}
            />
          </div>
        </fieldset>
        <button type="submit" disabled={files().length === 0}>
          Convert
        </button>
      </form>
      <p>Files in queue: {files().length}</p>
      <p>Output type: {outputType()}</p>

      {files().length > 0 && <button onClick={clearAll}>Clear all</button>}

      <div style={{ display: "flex", "flex-wrap": "wrap", gap: "1rem", "margin-top": "1rem" }}>
        <For each={files()}>
          {(item) => (
            <div style={{ position: "relative" }}>
              <img
                src={item.preview}
                alt={item.file.name}
                style={{
                  width: "150px",
                  height: "100px",
                  "object-fit": "cover",
                }}
              />
              <button
                onClick={() => removeFile(item.id)}
                style={{ position: "absolute", top: "4px", right: "4px" }}
              >
                ×
              </button>
              <p>{Math.round(item.file.size / 1024)}kb</p>
            </div>
          )}
        </For>
      </div>

      <div style={{ display: "flex", "flex-wrap": "wrap", gap: "1rem", "margin-top": "1rem" }}>
        <For each={files()}>
          {(item) =>
            item.result && (
              <div style={{ position: "relative" }}>
                <img
                  src={URL.createObjectURL(item.result)}
                  alt={item.file.name}
                  style={{
                    width: "150px",
                    height: "100px",
                    "object-fit": "cover",
                  }}
                />
                <button
                  onClick={() => removeFile(item.id)}
                  style={{ position: "absolute", top: "4px", right: "4px" }}
                >
                  ×
                </button>
                <p>{Math.round(item.file.size / 1024)}kb</p>
              </div>
            )
          }
        </For>
      </div>
    </div>
  );
}
