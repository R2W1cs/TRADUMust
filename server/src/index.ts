import "./load-env.js";
import { app } from "./app.js";

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  console.log(`TRADUMUST API running on http://localhost:${PORT}`);
});
