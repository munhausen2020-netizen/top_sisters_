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
    title: "Женские имена России",
    description: "Голосуй за любимую.",
};

export default function RootLayout({
                                       children,
                                   }) {
    return (
        <html lang="ru">
        <body className={pressStart2P.variable}>
        {children}

        {/* =====================================================
            YANDEX METRIKA
        ===================================================== */}

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


        {/* =====================================================
            VK ADS / TOP.MAIL.RU PIXEL
        ===================================================== */}

        <Script
            id="vk-ads-pixel"
            strategy="afterInteractive"
        >
            {`
            var _tmr = window._tmr || (window._tmr = []);

            _tmr.push({
              id: "3796075",
              type: "pageView",
              start: (new Date()).getTime()
            });

            (function (d, w, id) {
              if (d.getElementById(id)) return;

              var ts = d.createElement("script");

              ts.type = "text/javascript";
              ts.async = true;
              ts.id = id;
              ts.src =
                "https://top-fwz1.mail.ru/js/code.js";

              var f = function () {
                var s =
                  d.getElementsByTagName("script")[0];

                s.parentNode.insertBefore(
                  ts,
                  s
                );
              };

              if (
                w.opera ==
                "[object Opera]"
              ) {
                d.addEventListener(
                  "DOMContentLoaded",
                  f,
                  false
                );
              } else {
                f();
              }
            })(
              document,
              window,
              "tmr-code"
            );
          `}
        </Script>

        <noscript>
            <div>
                <img
                    src="https://top-fwz1.mail.ru/counter?id=3796075;js=na"
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