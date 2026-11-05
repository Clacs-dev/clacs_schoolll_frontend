import { expect, test, type Page } from '@playwright/test'

const CLASSES = [{ id: 5, designacao: '5.ª Classe', nivel: 'Ensino Primário' }]

async function preparar(page: Page) {
  await page.route('**/api/publico/candidaturas/classes', (r) => r.fulfill({ json: CLASSES }))
}

test.describe('Site público', () => {
  test('a raiz mostra o site sem pedir sessão e navega pelas páginas', async ({ page }) => {
    await preparar(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Educar é criar laços')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await nav.getByRole('link', { name: 'Galeria' }).click()
    await expect(page.getByRole('heading', { name: 'Os nossos momentos' })).toBeVisible()
    await nav.getByRole('link', { name: 'Oferta educativa' }).click()
    await expect(page.getByRole('heading', { name: 'Creche' })).toBeVisible()
    await nav.getByRole('link', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: 'Iniciar sessão' })).toBeVisible()
  })

  test('a galeria filtra e amplia as fotografias', async ({ page }) => {
    await page.goto('/galeria')
    const fotos = page.locator('.s-grelha button')
    await expect(fotos).toHaveCount(22)
    await page.getByRole('button', { name: 'Os nossos espaços' }).click()
    await expect(fotos).toHaveCount(7)
    await fotos.first().click()
    const dialogo = page.getByRole('dialog', { name: 'Fotografia ampliada' })
    await expect(dialogo).toBeVisible()
    await expect(dialogo).toContainText('1 / 7')
    await page.keyboard.press('ArrowRight')
    await expect(dialogo).toContainText('2 / 7')
    await page.keyboard.press('Escape')
    await expect(dialogo).toBeHidden()
  })

  test('a pré-inscrição envia os campos da API e junta o resto em observações', async ({ page }) => {
    await preparar(page)
    let corpo: Record<string, unknown> = {}
    await page.route('**/api/publico/candidaturas', (r) => {
      corpo = r.request().postDataJSON()
      return r.fulfill({ status: 201, json: { referencia: 42, duplicada: false, mensagem: 'Recebemos a pré-inscrição.' } })
    })
    await page.goto('/candidatura')
    await page.getByLabel('Nome completo da criança').fill('Ana Teste')
    await page.getByLabel('Classe pretendida').selectOption('5')
    await page.getByLabel('Necessidades educativas especiais').selectOption('Não')
    await page.getByLabel('Tem irmão(s) a estudar na escola?').selectOption('Sim')
    await page.getByLabel('Nome do encarregado de educação').fill('Rosa Teste')
    await page.getByLabel('Nacionalidade').fill('Angolana')
    await page.getByLabel('Telefone / WhatsApp').fill('+244 900 000 000')
    await page.getByRole('button', { name: '+ Adicionar segundo responsável' }).click()
    await page.getByLabel(/^Nome\s*\*?$/).fill('João Teste')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Enviar pré-inscrição' }).click()

    await expect(page.locator('.okm')).toContainText('Recebemos a pré-inscrição')
    await expect(page.getByText('42')).toBeVisible()
    expect(corpo).toMatchObject({ nome_aluno: 'Ana Teste', classe_id: 5, nome_encarregado: 'Rosa Teste', parentesco: 'mae', aceito: true })
    for (const fora of ['nee', 'irmaos', 'nacionalidade', 'r2_nome']) expect(corpo).not.toHaveProperty(fora)
    expect(corpo.observacoes).toBe('Necessidades educativas especiais: Não\nIrmão(s) já na instituição: Sim\nNacionalidade do responsável: Angolana\nSegundo responsável: João Teste')
  })

  test('não há deslocação horizontal no telemóvel e o menu abre', async ({ page }) => {
    await preparar(page)
    await page.setViewportSize({ width: 375, height: 800 })
    for (const url of ['/', '/oferta-educativa', '/galeria', '/candidatura', '/contactos', '/login']) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(sobra, url).toBeLessThanOrEqual(0)
    }
    await page.goto('/')
    await page.getByRole('button', { name: 'Abrir o menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Contactos' })).toBeVisible()
  })
})
