// For pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Smartsupp Live Chat */}
        <script dangerouslySetInnerHTML={{
          __html: `
            var _smartsupp = _smartsupp || {};
            _smartsupp.key = '7e4e75d9f82cdd637468f9b81637a5f877932168';
          `
        }} />
        <script async src="https://www.smartsuppchat.com/loader.js?" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
