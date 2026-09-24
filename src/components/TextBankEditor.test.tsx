import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextBankEditor } from "./TextBankEditor";

describe("TextBankEditor", () => {
  it("merender judul, nilai, dan tombol simpan", () => {
    render(
      <TextBankEditor
        title="Bank Kalimat"
        subtitle="Untuk Sentence Battle"
        value="I run"
        onChange={() => {}}
        onSave={() => {}}
        saveLabel="💾 Simpan"
      />,
    );
    expect(screen.getByText("Bank Kalimat")).toBeInTheDocument();
    expect(screen.getByText("Untuk Sentence Battle")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("I run");
    expect(screen.getByRole("button", { name: "💾 Simpan" })).toBeInTheDocument();
  });

  it("memanggil onChange saat mengetik", () => {
    const onChange = vi.fn();
    render(
      <TextBankEditor title="T" value="" onChange={onChange} onSave={() => {}} saveLabel="Simpan" />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "halo" } });
    expect(onChange).toHaveBeenCalledWith("halo");
  });

  it("menampilkan tombol muat hanya bila onLoad diberikan", () => {
    const onLoad = vi.fn();
    const { rerender } = render(
      <TextBankEditor
        title="T"
        value=""
        onChange={() => {}}
        onLoad={onLoad}
        onLoadLabel="Muat"
        onSave={() => {}}
        saveLabel="Simpan"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Muat" }));
    expect(onLoad).toHaveBeenCalledTimes(1);

    rerender(
      <TextBankEditor title="T" value="" onChange={() => {}} onSave={() => {}} saveLabel="Simpan" />,
    );
    expect(screen.queryByRole("button", { name: "Muat" })).not.toBeInTheDocument();
  });

  it("memanggil onSave saat tombol simpan ditekan", () => {
    const onSave = vi.fn();
    render(
      <TextBankEditor title="T" value="" onChange={() => {}} onSave={onSave} saveLabel="Simpan" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
