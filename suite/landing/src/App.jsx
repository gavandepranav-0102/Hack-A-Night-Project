import { useEffect } from "react";
import "./styles.css";

const pageMarkup = "<div id=\"sp\" aria-hidden=\"true\"></div>\n<div id=\"bg\" aria-hidden=\"true\"></div><div id=\"shade\" aria-hidden=\"true\"></div><div id=\"grid\" aria-hidden=\"true\"></div>\n<header>\n <a class=\"logo\" href=\"#\" id=\"logo\" aria-label=\"BuildProof AI, back to top\"><b>BUILDPROOF</b><i>AI</i></a>\n <nav class=\"links\" id=\"links\" aria-label=\"Sections\"></nav>\n <div class=\"end\" id=\"navRight\"></div>\n</header>\n<main id=\"main\"></main>\n<footer>BuildProof AI \u00b7 Frontend demo \u00b7 data stays in this browser \u00b7 demo sign-in is not real authentication</footer>\n<div id=\"modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"dlgTitle\"><div class=\"dlg\" id=\"dlg\"></div></div>\n<div id=\"toasts\" aria-live=\"polite\"></div>";

export default function App() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/buildproof.js";
    script.async = false;
    document.body.appendChild(script);

    return () => script.remove();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: pageMarkup }} />;
}
