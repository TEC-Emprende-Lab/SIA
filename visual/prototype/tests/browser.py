"""Run with installed Python Playwright: python3 tests/browser.py [base URL]."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from cube import verify_cube

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5174/'
ARTIFACTS = Path('/tmp/catalitec-verification')
ARTIFACTS.mkdir(exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1050})
    errors, external, checks = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: external.append(request.url) if not request.url.startswith(('http://127.0.0.1:', 'data:', 'file:')) else None)
    page.goto(BASE)
    expect(page.get_by_role('heading', name='Diagnóstico 360°', exact=True)).to_be_visible()
    expect(page.locator('.area-card')).to_have_count(6)
    page.screenshot(path=str(ARTIFACTS / 'desktop.png'), full_page=True)
    checks.append('Six Cubo 360 areas render; no initial overflow')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')

    def dialog():
        return page.locator('dialog[open]').last

    def close_all():
        while page.locator('dialog[open]').count():
            dialog().get_by_role('button', name='Cerrar panel', exact=True).click()

    def nav(name):
        close_all()
        page.get_by_role('navigation', name='Navegación del proyecto').get_by_role('button', name=name, exact=True).click()

    verify_cube(page, browser, BASE, ARTIFACTS)
    checks.append('Cubo 360: six mapped faces, mouse drag, button controls, keyboard activation, responsive widths and reduced motion')

    # A recoverable save failure must keep the entire draft available.
    page.get_by_role('button', name='Opciones de demostración').click()
    dialog().get_by_role('button', name='Simular error en próximo guardado').click()
    page.get_by_role('button', name='Nuevo diagnóstico', exact=True).click()
    dialog().get_by_label('Observación general').fill('Fotografía de prueba: progreso técnico y revisión de sostenibilidad financiera.')
    rows = dialog().locator('.cube-edit-row')
    expect(rows).to_have_count(6)
    for index in range(6):
        row = rows.nth(index)
        row.get_by_role('button', name=str(3 + index % 2), exact=True).click()
        row.get_by_label('Observaciones', exact=True).fill(f'Área {index + 1}: evaluación realizada con el equipo; respaldo pendiente de consolidación.')
    dialog().get_by_role('button', name='Guardar diagnóstico', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Tus datos siguen aquí')
    expect(page.get_by_role('button', name='Entendido, volver a intentar')).to_be_visible()
    page.get_by_role('button', name='Entendido, volver a intentar').click()
    expect(dialog()).to_contain_text('Área 6: evaluación realizada')
    dialog().get_by_role('button', name='Guardar diagnóstico', exact=True).click()
    expect(page.locator('dialog[open]')).to_have_count(0)
    page.get_by_role('button', name='Enviar a revisión', exact=True).click()
    page.get_by_role('button', name='Aprobar diagnóstico', exact=True).click()
    dialog().get_by_role('button', name='Confirmar aprobación').click()
    expect(page.locator('dialog[open]')).to_have_count(0)
    expect(page.locator('.diagnostic-toolbar')).to_contain_text('Aprobado')
    checks.append('Create all six Cubo 360 areas in a single-page editor, recover failed save, submit and approve diagnostic')

    nav('Objetivos y actividades')
    expect(page.locator('.objective-strip')).to_have_count(3)
    page.get_by_role('button', name='Editar', exact=True).first.click()
    dialog().get_by_label('Área del Cubo 360').select_option('mvp')
    dialog().get_by_label('Ambición vinculada (opcional)').select_option('am1')
    dialog().get_by_role('button', name='Guardar objetivo', exact=True).click()
    expect(page.locator('dialog[open]')).to_have_count(0)
    checks.append('Assign a Cubo 360 area and optional ambition to an objective')
    page.get_by_role('button', name='Nueva actividad', exact=True).click()
    dialog().get_by_label('Nombre de la actividad').fill('Consolidar los costos del piloto')
    dialog().get_by_label('Objetivo asociado').select_option('o1')
    dialog().get_by_role('button', name='Crear actividad', exact=True).click()
    expect(page.locator('dialog[open]')).to_have_count(0)
    page.locator('.work-card').filter(has_text='Consolidar los costos del piloto').click()
    dialog().get_by_role('button', name='Agregar evidencia', exact=True).click()
    dialog().get_by_label('Título', exact=True).fill('Matriz de costos consolidada')
    dialog().get_by_label('Descripción del respaldo').fill('Registro ficticio de costos por unidad y supuestos revisados con el equipo.')
    dialog().get_by_role('button', name='Agregar evidencia', exact=True).click()
    expect(page.locator('dialog[open]')).to_have_count(1)
    expect(dialog()).to_contain_text('Matriz de costos consolidada')
    dialog().get_by_role('button', name='Completar actividad', exact=True).click()
    dialog().get_by_role('button', name='Confirmar', exact=True).click()
    expect(page.locator('dialog[open]')).to_have_count(1)
    expect(dialog()).to_contain_text('Completada')
    checks.append('Create activity, attach mock evidence and complete activity without duplicate objectives')

    nav('Evolución')
    expect(page.locator('tbody tr')).to_have_count(6)
    page.screenshot(path=str(ARTIFACTS / 'evolution.png'), full_page=True)
    nav('Informes')
    page.get_by_role('button', name='Preparar informe', exact=True).click()
    dialog().get_by_role('button', name='Revisar fuentes', exact=True).click()
    expect(dialog()).to_contain_text('Matriz de costos consolidada')
    dialog().get_by_role('button', name='Generar vista previa', exact=True).click()
    expect(dialog()).to_contain_text('Pendiente de completar')
    expect(dialog()).to_contain_text('Matriz de costos consolidada')
    dialog().get_by_role('button', name='Guardar borrador', exact=True).click()
    expect(dialog()).to_contain_text('Borrador')
    page.screenshot(path=str(ARTIFACTS / 'report.png'), full_page=True)
    dialog().get_by_role('button', name='Enviar a revisión', exact=True).click()
    expect(dialog()).to_contain_text('En revisión')
    dialog().get_by_role('button', name='Aprobar versión', exact=True).click()
    dialog().get_by_role('button', name='Confirmar aprobación', exact=True).click()
    expect(page.locator('dialog[open]')).to_have_count(1)
    expect(dialog()).to_contain_text('Versión de solo lectura')
    expect(dialog().get_by_role('button', name='Editar redacción')).to_have_count(0)
    dialog().get_by_role('button', name='Crear nueva versión').click()
    expect(dialog()).to_contain_text('v2')
    expect(dialog()).to_contain_text('Borrador')
    checks.append('Generate sourced report draft, submit, freeze approval and create linked version 2')

    close_all()
    page.get_by_role('button', name='Opciones de demostración').click()
    dialog().get_by_label('Simular rol').select_option('Emprendedor')
    expect(page.get_by_role('button', name='Preparar informe', exact=True)).to_have_count(0)
    nav('Objetivos y actividades')
    expect(page.get_by_role('button', name='Aprobar', exact=True)).to_have_count(0)
    checks.append('Entrepreneur view hides managerial approval and report generation')

    # Verify all routes at phone widths, browser history and offline source constraints.
    page.set_viewport_size({'width': 390, 'height': 844})
    routes = ['Resumen', 'Diagnóstico 360°', 'Ambiciones', 'Objetivos y actividades', 'Evidencias', 'Evolución', 'Informes', 'Reuniones', 'Finanzas y compras', 'Chat', 'Equipo']
    for section in routes:
        page.get_by_role('button', name='Abrir navegación').click()
        page.get_by_role('navigation', name='Navegación del proyecto').get_by_role('button', name=section, exact=True).click()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Overflow in {section}'
        assert not page.locator('.sidebar').evaluate("e => e.classList.contains('is-open')")
        if section == 'Diagnóstico 360°':
            page.screenshot(path=str(ARTIFACTS / 'mobile.png'), full_page=True)
        if section == 'Ambiciones':
            page.get_by_role('button', name='Nueva ambición', exact=True).click()
            page.screenshot(path=str(ARTIFACTS / 'mobile-ambition.png'), full_page=True)
            assert dialog().evaluate('e => e.scrollWidth <= e.clientWidth + 1')
            page.keyboard.press('Escape')
    page.go_back()
    expect(page.get_by_role('heading', name='Chat del proyecto', exact=True)).to_be_visible()
    page.set_viewport_size({'width': 320, 'height': 740})
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    checks.append('All 11 routes at 390px without horizontal page overflow; mobile modal, Escape and history work')
    assert not errors, errors
    assert not external, external
    result = {'checks': checks, 'console_errors': errors, 'external_requests': external, 'artifacts': str(ARTIFACTS)}
    (ARTIFACTS / 'result.json').write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print(json.dumps(result, indent=2, ensure_ascii=False))
    browser.close()
