import os
import tempfile
import unittest

from gemini_module import _apply_new_files_directly


class ApplyNewFilesTests(unittest.TestCase):
    def test_apply_replaces_existing_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = tmpdir
            rel_path = "foo.txt"
            full_path = os.path.join(workspace, rel_path)
            new_path = full_path + ".new"

            # Create original and .new versions
            with open(full_path, "w") as f:
                f.write("old content")
            with open(new_path, "w") as f:
                f.write("new content")

            applied = _apply_new_files_directly(workspace, [rel_path])

            self.assertEqual(applied, 1)
            with open(full_path) as f:
                self.assertEqual(f.read(), "new content")
            self.assertFalse(os.path.exists(new_path))

    def test_apply_creates_new_file_if_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = tmpdir
            rel_path = "bar/baz.txt"
            full_path = os.path.join(workspace, rel_path)
            new_path = full_path + ".new"

            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(new_path, "w") as f:
                f.write("brand new file")

            applied = _apply_new_files_directly(workspace, [rel_path])

            self.assertEqual(applied, 1)
            with open(full_path) as f:
                self.assertEqual(f.read(), "brand new file")
            self.assertFalse(os.path.exists(new_path))

    def test_apply_skips_when_no_new_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = tmpdir
            rel_path = "no_new_here.txt"
            full_path = os.path.join(workspace, rel_path)

            with open(full_path, "w") as f:
                f.write("unchanged")

            applied = _apply_new_files_directly(workspace, [rel_path])

            self.assertEqual(applied, 0)
            with open(full_path) as f:
                self.assertEqual(f.read(), "unchanged")


if __name__ == "__main__":
    unittest.main()


