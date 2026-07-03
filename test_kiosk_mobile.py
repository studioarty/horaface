import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream'
            ]
        )
        context = await browser.new_context(
            viewport={'width': 430, 'height': 932}, # iPhone 14 Pro Max size
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            permissions=['camera', 'microphone']
        )
        page = await context.new_page()
        print("Navegando para o quiosque teste no modo mobile...")
        await page.goto("https://compositor.sbs/quiosque-teste?id=kiosk-celular2")
        
        print("Aguardando carregamento da camera fake e dos elementos...")
        await page.wait_for_timeout(4000)
        
        # Clicar em FECHAR do prompt do PWA se aparecer
        try:
            fechar_btn = page.get_by_text("FECHAR")
            count = await fechar_btn.count()
            if count > 0:
                print(f"Encontrou {count} botao FECHAR. Clicando...")
                await fechar_btn.first.click()
                await page.wait_for_timeout(1000)
        except Exception as e:
            pass
            
        print("Tirando captura de tela em modo Mobile (Portrait)...")
        await page.screenshot(path="kiosk_mobile_validation.png")
        
        print("Sucesso! Captura salva.")
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
