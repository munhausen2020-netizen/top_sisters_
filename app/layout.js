import "./globals.css";
import Script from "next/script";
import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({
    weight: "400",
    subsets: ["latin", "cyrillic"],
    variable: "--font-pixel",
    display: "swap",
});

export const metadata = {
    title: "women name...",
    description: "Голосуй за любимую.",
};

export default function RootLayout({
                                       children,
                                   }) {
    return (
        <html lang="ru">
        <body className={pressStart2P.variable}>
        {children}

        <Script
            id="yandex-metrika"
            strategy="afterInteractive"
        >
            {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){
                (m[i].a=m[i].a||[]).push(arguments)
              };
              m[i].l=1*new Date();
              k=e.createElement(t);
              a=e.getElementsByTagName(t)[0];
              k.async=1;
              k.src=r;
              a.parentNode.insertBefore(k,a);
            })(
              window,
              document,
              "script",
              "https://mc.yandex.ru/metrika/tag.js",
              "ym"
            );

            ym(112874757, "init", {
              clickmap: true,
              trackLinks: true,
              accurateTrackBounce: true,
              webvisor: true
            });
          `}
        </Script>

        <noscript>
            <div>
                <img
                    src="https://mc.yandex.ru/watch/112874757"
                    style={{
                        position: "absolute",
                        left: "-9999px",
                    }}
                    alt=""
                />
            </div>
        </noscript>
        </body>
        </html>
    );
}