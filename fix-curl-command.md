# Fixed curl command for /api/cards/buy

The original curl command had some issues with the friends array format. Here's the corrected version:

## Fixed Command

```bash
curl 'https://docklabs.in.ngrok.io/api/cards/buy' \
  -H 'accept: */*' \
  -H 'accept-language: en-GB,en;q=0.9' \
  -H 'content-type: application/json' \
  -H 'origin: https://docklabs.in.ngrok.io' \
  -H 'priority: u=1, i' \
  -H 'referer: https://docklabs.in.ngrok.io/' \
  -H 'sec-ch-ua: "Chromium";v="141", "Not?A_Brand";v="8"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'sec-fetch-storage-access: none' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  --data-raw '{"tokenId":"2","userWallet":"0x631046BC261e0b2e3DB480B87D2B7033d9720c90","friends":[]}'
```

## Key Fixes

1. **tokenId**: Changed from `2` to `"2"` (string format as expected by validation)
2. **friends**: Kept as empty array `[]` which is valid according to the schema

## Alternative Formats

### Without friends field (recommended if not needed):
```bash
curl 'https://docklabs.in.ngrok.io/api/cards/buy' \
  -H 'content-type: application/json' \
  --data-raw '{"tokenId":"2","userWallet":"0x631046BC261e0b2e3DB480B87D2B7033d9720c90"}'
```

### With friends (if you want to include friends):
```bash
curl 'https://docklabs.in.ngrok.io/api/cards/buy' \
  -H 'content-type: application/json' \
  --data-raw '{
    "tokenId": "2",
    "userWallet": "0x631046BC261e0b2e3DB480B87D2B7033d9720c90",
    "friends": [
      {
        "fid": 12345,
        "username": "friend_username",
        "pfp": "https://example.com/avatar.jpg",
        "wallet": "0xFriendWalletAddress"
      }
    ]
  }'
```