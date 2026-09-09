"""US-PRO-005: keyboard, button-controlled and responsive Cubo 360 (no drag) interactions."""
from playwright.sync_api import expect


def verify_cube(page, browser, base, artifacts):
    cube = page.locator('.cube')
    faces = page.locator('.cube-face')
    expect(faces).to_have_count(6)
    expected = {
        'front': ('mvp', 'Producto mínimo viable'),
        'right': ('business-model', 'Modelo de negocio'),
        'back': ('segmented-market', 'Mercado segmentado'),
        'left': ('channels', 'Canales definidos'),
        'top': ('identity', 'Identidad y dirección estratégica'),
        'bottom': ('incorporation', 'Constitución de sociedad'),
    }
    for position, (area_id, name) in expected.items():
        face = page.locator(f'.cube-face--{position}')
        expect(face).to_have_attribute('data-area-id', area_id)
        # Native keyboard activation opens the area detail even on hidden faces.
        face.focus()
        expect(face).to_be_focused()
        page.keyboard.press('Enter')
        expect(page.locator('dialog[open] h2')).to_have_text(name)
        page.keyboard.press('Escape')
    # Rich detail keeps historical assessment separate from today's work.
    page.locator('.cube-face--front').focus()
    page.keyboard.press('Enter')
    detail = page.locator('dialog[open]')
    expect(detail.locator('.area-detail-number strong')).to_have_text('4')
    expect(detail.locator('.area-detail-timeline li')).to_have_count(3)
    expect(detail.locator('.area-detail-objective')).to_have_count(1)
    expect(detail.locator('.area-detail-objective')).to_contain_text('Validar la prueba piloto')
    expect(detail.locator('.area-detail-work-note')).to_contain_text('estado actual')
    detail.get_by_role('button', name='Modelo de negocio', exact=True).click()
    expect(detail.locator('h2')).to_have_text('Modelo de negocio')
    expect(detail.locator('.area-detail-number strong')).to_have_text('3')
    expect(detail.locator('.area-detail-nav button[aria-pressed=true]')).to_have_count(1)
    detail.get_by_role('button', name='Identidad estratégica', exact=True).click()
    expect(detail.locator('.area-detail-empty')).to_contain_text('todavía no tiene objetivos')
    detail.get_by_role('button', name='MVP', exact=True).click()
    detail.screenshot(path=str(artifacts / 'area-detail-desktop.png'))
    detail.locator('.area-detail-objective').click()
    expect(page.get_by_role('heading', name='Objetivos y actividades', exact=True)).to_be_visible()
    expect(page.locator('dialog[open]')).to_have_count(0)
    page.get_by_role('navigation', name='Navegación del proyecto').get_by_role('button', name='Diagnóstico 360°', exact=True).click()
    # First diagnostic cannot show future historical ratings.
    page.get_by_label('Seleccionar diagnóstico', exact=True).select_option('d1')
    page.locator('.area-card').first.click()
    expect(detail.locator('.area-detail-number strong')).to_have_text('2')
    expect(detail.locator('.area-detail-timeline li')).to_have_count(1)
    expect(detail.locator('.area-detail-score')).to_contain_text('Sin base')
    detail.get_by_role('button', name='Volver al cubo', exact=True).click()
    expect(page.locator('.area-card').first).to_be_focused()
    page.get_by_label('Seleccionar diagnóstico', exact=True).select_option('d3')

    # Tab order traverses native face buttons.
    faces.first.focus()
    page.keyboard.press('Tab')
    expect(faces.nth(1)).to_be_focused()
    page.keyboard.press('Space')
    expect(page.locator('dialog[open] h2')).to_have_text('Modelo de negocio')
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Restablecer vista', exact=True).click()
    page.wait_for_timeout(350)
    front = page.locator('.cube-face--front')
    front.click()
    expect(page.locator('dialog[open] h2')).to_have_text('Producto mínimo viable')
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Restablecer vista', exact=True).click()
    page.wait_for_timeout(350)
    # Mouse drag rotates without opening a detail; pitch clamps to ±90° and release ends the drag.
    before = cube.get_attribute('style')
    box = page.locator('.cube-scene').bounding_box()
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + 95, y + 45, steps=12)
    page.mouse.up()
    assert cube.get_attribute('style') != before
    expect(page.locator('dialog[open]')).to_have_count(0)
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x, y + 700, steps=12)
    page.mouse.up()
    assert 'rotateX(-90deg)' in cube.get_attribute('style')
    expect(cube).not_to_have_class('cube dragging')
    expect(page.locator('dialog[open]')).to_have_count(0)
    for label in ['Girar a la izquierda', 'Girar a la derecha', 'Ver cara superior', 'Restablecer vista']:
        before = cube.get_attribute('style')
        page.get_by_role('button', name=label, exact=True).click()
        assert before != cube.get_attribute('style'), label
    page.locator('.area-card').last.click()
    expect(page.locator('dialog[open] h2')).to_have_text('Constitución de sociedad')
    assert 'rotateX(90deg)' in cube.get_attribute('style')
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Restablecer vista', exact=True).click()
    page.wait_for_timeout(350)
    page.screenshot(path=str(artifacts / 'cube-desktop.png'), full_page=True)
    # Mobile: no horizontal overflow, buttons work and motion respects the user preference.
    context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion='reduce')
    mobile = context.new_page()
    mobile.goto(base)
    expect(mobile.locator('.cube-face')).to_have_count(6)
    for width in [320, 390, 768, 1024]:
        mobile.set_viewport_size({'width': width, 'height': 900})
        assert not mobile.evaluate('document.documentElement.scrollWidth > innerWidth'), width
    mobile.set_viewport_size({'width': 390, 'height': 844})
    mobile.locator('.cube-scene').scroll_into_view_if_needed()
    mobile.get_by_role('button', name='Restablecer vista', exact=True).click()
    mobile.locator('.cube-face--front').tap()
    expect(mobile.locator('dialog[open] h2')).to_have_text('Producto mínimo viable')
    for width in [320, 390, 768]:
        mobile.set_viewport_size({'width': width, 'height': 844})
        assert mobile.locator('dialog[open]').evaluate('e => e.scrollWidth <= e.clientWidth + 1'), width
        for name in ['Constitución', 'Identidad estratégica', 'MVP']:
            mobile.locator('.area-detail-nav').get_by_role('button', name=name, exact=True).click()
            expect(mobile.locator('.area-detail-nav button[aria-pressed=true]')).to_have_count(1)
    mobile.set_viewport_size({'width': 390, 'height': 844})
    mobile.locator('dialog[open]').screenshot(path=str(artifacts / 'area-detail-mobile.png'))
    mobile.get_by_role('button', name='Cerrar panel', exact=True).click()
    for selector in ['.cube', '.cube-face']:
        assert mobile.locator(selector).first.evaluate("e => getComputedStyle(e).transitionDuration") == '0s'
    assert mobile.locator('.cube360').evaluate("e => getComputedStyle(e).animationName") == 'none'
    mobile.get_by_role('button', name='Restablecer vista', exact=True).click()
    mobile.screenshot(path=str(artifacts / 'cube-mobile.png'), full_page=True)
    context.close()