import socket
import unittest
from types import SimpleNamespace
from unittest.mock import call, patch

from backend.traceroute import traceroute_scappy


class TracerouteScapyTestCase(unittest.TestCase):
    @patch("backend.traceroute.socket.gethostbyaddr", side_effect=socket.herror)
    @patch("backend.traceroute.sr1")
    @patch("backend.traceroute.socket.gethostbyname", return_value="142.251.34.238")
    def test_includes_destination_reply_and_stops_probing(
        self, mock_gethostbyname, mock_sr1, mock_gethostbyaddr
    ):
        mock_sr1.side_effect = [
            SimpleNamespace(src="192.168.0.1", ttl=63),
            SimpleNamespace(src="142.251.34.238", ttl=117),
        ]

        result = traceroute_scappy("google.com")

        self.assertEqual(mock_sr1.call_count, 2)
        self.assertEqual(
            [hop["address"] for hop in result["timing"]],
            ["192.168.0.1", "142.251.34.238"],
        )
        self.assertEqual(result["timing"][0]["ttl"], 1)
        self.assertEqual(result["timing"][0]["reply_ttl"], 63)
        self.assertEqual(result["timing"][1]["ttl"], 2)
        self.assertEqual(result["timing"][1]["reply_ttl"], 117)
        self.assertEqual(result["timing"][0]["hostname"], "192.168.0.1")
        self.assertEqual(result["total_hops"], 2)
        mock_gethostbyname.assert_called_once_with("google.com")
        self.assertEqual(mock_gethostbyaddr.call_args_list, [
            call("192.168.0.1"),
            call("142.251.34.238"),
        ])

    @patch(
        "backend.traceroute.socket.gethostbyname",
        side_effect=socket.gaierror("name resolution failed"),
    )
    @patch("backend.traceroute.sr1")
    def test_failed_dns_lookup_raises_clear_value_error(
        self, mock_sr1, mock_gethostbyname
    ):
        with self.assertRaisesRegex(ValueError, "Could not resolve host 'bad.invalid'"):
            traceroute_scappy("bad.invalid")

        mock_sr1.assert_not_called()


if __name__ == "__main__":
    unittest.main()
