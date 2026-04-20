
with open('dashboardController.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Safely inject backticks where db.query( SELECT... is missing them
text = re.sub(
    r'(const \[revenueRows\] = await db\.query\()\s*SELECT',
    r'\1\n          SELECT',
    text,
    flags=re.IGNORECASE
)
text = re.sub(
    r'ON o\.id = od\.order_id\s*\);',
    r'ON o.id = od.order_id\n        );',
    text
)

text = re.sub(
    r'(const \[returnsRows\] = await db\.query\()\s*SELECT',
    r'\1\n          SELECT',
    text,
    flags=re.IGNORECASE
)
text = re.sub(
    r'WHERE sr\.status != \'cancelled\'\s*\);',
    r'WHERE sr.status != \'cancelled\'\n        );',
    text
)

with open('dashboardController.js', 'w', encoding='utf-8') as f:
    f.write(text)

