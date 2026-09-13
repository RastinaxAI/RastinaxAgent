/**
 * Measures chunk arrival times for the streaming chat chain.
 * Usage: node scripts/measure-stream.cjs <url> [body]
 * Prints "t+<ms>  +<len>chars  <preview>" per chunk.
 */
const url = process.argv[2] || "http://127.0.0.1:8001/api/v1/chat/";
const body = process.argv[3] || JSON.stringify({ message: "سلام، در دو جمله معرفی کن" });

const start = Date.now();
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
});

console.log(`status=${res.status} content-type=${res.headers.get("content-type")}`);

if (!res.ok) {
  console.log(await res.text());
  process.exit(0);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let total = 0;
let chunks = 0;

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  const text = decoder.decode(value, { stream: true });
  total += text.length;
  chunks += 1;
  console.log(
    `t+${String(Date.now() - start).padStart(5)}ms  +${String(text.length).padStart(3)}  ${JSON.stringify(text.slice(0, 40))}`
  );
}
console.log(`DONE chunks=${chunks} totalChars=${total} elapsed=${Date.now() - start}ms`);
